'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import api from './api';
import {
  dashboardService,
  companyService,
  userService,
  jobService,
  subscriptionService,
  iapService,
  trustService,
  matchService,
} from '@/services';
import type {
  User,
  Company,
  CompanyVerification,
  JobPosting,
  Review,
  Subscription,
  IAPTransaction,
  WebhookEvent as WebhookEventType,
  TrustEvent,
  LowTrustCompany,
  Match,
  DashboardStats,
  UserGrowthData,
  RevenueData,
  PaginatedResponse,
  UserFilters,
  CompanyFilters,
  JobFilters,
  ReviewFilters,
} from '@/types';

// Query keys
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters & { page?: number; pageSize?: number }) => [...queryKeys.users.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
  companies: {
    all: ['companies'] as const,
    lists: () => [...queryKeys.companies.all, 'list'] as const,
    list: (filters: CompanyFilters & { page?: number; pageSize?: number }) => [...queryKeys.companies.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.companies.all, 'detail', id] as const,
    verifications: () => [...queryKeys.companies.all, 'verifications'] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters: JobFilters & { page?: number; pageSize?: number }) => [...queryKeys.jobs.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.jobs.all, 'detail', id] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    lists: () => [...queryKeys.reviews.all, 'list'] as const,
    list: (filters: ReviewFilters & { page?: number; pageSize?: number }) => [...queryKeys.reviews.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.reviews.all, 'detail', id] as const,
  },
  subscriptions: {
    all: ['subscriptions'] as const,
    lists: () => [...queryKeys.subscriptions.all, 'list'] as const,
    list: (filters: { status?: string; tier?: string; page?: number; pageSize?: number }) => [...queryKeys.subscriptions.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.subscriptions.all, 'detail', id] as const,
  },
  iap: {
    transactions: ['iap', 'transactions'] as const,
    webhooks: ['iap', 'webhooks'] as const,
  },
  trust: {
    all: ['trust'] as const,
    events: ['trust', 'events'] as const,
    lowTrust: ['trust', 'low-trust'] as const,
  },
  matches: {
    all: ['matches'] as const,
    lists: () => [...queryKeys.matches.all, 'list'] as const,
    list: (filters: { status?: string; page?: number; pageSize?: number }) => [...queryKeys.matches.lists(), filters] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
    userGrowth: ['dashboard', 'user-growth'] as const,
    revenue: ['dashboard', 'revenue'] as const,
    activity: ['dashboard', 'activity'] as const,
  },
};

// Dashboard hooks
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats,
    queryFn: ({ signal }) => dashboardService.stats(signal),
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch when navigating back to dashboard
  });
}

export function useUserGrowthData(days: number = 30) {
  return useQuery<UserGrowthData[]>({
    queryKey: [...queryKeys.dashboard.userGrowth, days],
    queryFn: ({ signal }) => dashboardService.userGrowth(days, signal),
  });
}

export function useRevenueData(months: number = 12) {
  return useQuery<RevenueData[]>({
    queryKey: [...queryKeys.dashboard.revenue, months],
    queryFn: ({ signal }) => dashboardService.revenue(months, signal),
  });
}

export function useDashboardActivity(limit: number = 50) {
  return useQuery<Array<{ id: string; type: string; description: string; createdAt: string }>>({
    queryKey: [...queryKeys.dashboard.activity, limit],
    queryFn: ({ signal }) => dashboardService.activity(limit, signal),
  });
}

// Users hooks
export function useUsers(filters: UserFilters, page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<User>>({
    queryKey: queryKeys.users.list({ ...filters, page, pageSize }),
    queryFn: ({ signal }) => userService.list(filters, page, pageSize, signal),
  });
}

export function useUser(id: string) {
  return useQuery<User>({
    queryKey: queryKeys.users.detail(id),
    queryFn: ({ signal }) => userService.get(id, signal),
    enabled: !!id,
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      userService.ban(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUnbanUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => userService.unban(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

// Companies hooks
export function useCompanies(filters: CompanyFilters, page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<Company>>({
    queryKey: queryKeys.companies.list({ ...filters, page, pageSize }),
    queryFn: ({ signal }) => companyService.list(filters, page, pageSize, signal),
  });
}

export function useCompany(id: string) {
  return useQuery<Company>({
    queryKey: queryKeys.companies.detail(id),
    queryFn: ({ signal }) => companyService.get(id, signal),
    enabled: !!id,
  });
}

export function useCompanyVerifications() {
  return useQuery<PaginatedResponse<CompanyVerification>>({
    queryKey: queryKeys.companies.verifications(),
    queryFn: ({ signal }) => companyService.verifications(signal),
  });
}

export function useApproveVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (verificationId: string) => companyService.approveVerification(verificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}

export function useRejectVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ verificationId, reason }: { verificationId: string; reason: string }) =>
      companyService.rejectVerification(verificationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}

export function useSuspendCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, reason }: { companyId: string; reason: string }) =>
      companyService.suspend(companyId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}

export function useUnsuspendCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => companyService.unsuspend(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}

// Jobs hooks
export function useJobs(filters: JobFilters, page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<JobPosting>>({
    queryKey: queryKeys.jobs.list({ ...filters, page, pageSize }),
    queryFn: ({ signal }) => jobService.list(filters, page, pageSize, signal),
  });
}

export function useJob(id: string) {
  return useQuery<JobPosting>({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: ({ signal }) => jobService.get(id, signal),
    enabled: !!id,
  });
}

export function useFlagJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, reason }: { jobId: string; reason: string }) =>
      jobService.flag(jobId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

export function useUnflagJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => jobService.unflag(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

export function useCloseJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => jobService.close(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.delete<{ message: string }>(`/admin/jobs/${jobId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}

// Reviews hooks
export function useReviews(filters: ReviewFilters, page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<Review>>({
    queryKey: queryKeys.reviews.list({ ...filters, page, pageSize }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>),
      });
      const { data } = await api.get<PaginatedResponse<Review>>(`/admin/reviews?${params}`);
      return data;
    },
  });
}

export function useUnflagReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data } = await api.post<{ message: string }>(`/admin/reviews/${reviewId}/unflag`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}

export function useRemoveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason: string }) => {
      const { data } = await api.post<{ message: string }>(`/admin/reviews/${reviewId}/remove`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all });
    },
  });
}

// Subscriptions hooks
export function useSubscriptions(filters: { status?: string; tier?: string }, page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<Subscription>>({
    queryKey: queryKeys.subscriptions.list({ ...filters, page, pageSize }),
    queryFn: ({ signal }) => subscriptionService.list(filters, page, pageSize, signal),
  });
}

export function useSubscription(id: string) {
  return useQuery<Subscription>({
    queryKey: queryKeys.subscriptions.detail(id),
    queryFn: ({ signal }) => subscriptionService.get(id, signal),
    enabled: !!id,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, reason }: { subscriptionId: string; reason: string }) =>
      subscriptionService.cancel(subscriptionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
    },
  });
}

export function useRevenueStats() {
  return useQuery({
    queryKey: ['subscriptions', 'revenue-stats'],
    queryFn: ({ signal }) => subscriptionService.revenueStats(signal),
  });
}

// IAP hooks
export function useIAPTransactions(filters: { status?: string; type?: string; provider?: string }, page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<IAPTransaction>>({
    queryKey: [...queryKeys.iap.transactions, filters, page, pageSize],
    queryFn: ({ signal }) => iapService.transactions(filters, page, pageSize, signal),
  });
}

export function useIAPTransaction(transactionId: string) {
  return useQuery<IAPTransaction>({
    queryKey: [...queryKeys.iap.transactions, transactionId],
    queryFn: ({ signal }) => iapService.transactionDetail(transactionId, signal),
    enabled: !!transactionId,
  });
}

export function useWebhookEvents(page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<WebhookEventType>>({
    queryKey: [...queryKeys.iap.webhooks, page, pageSize],
    queryFn: ({ signal }) => iapService.webhookEvents(page, pageSize, signal),
  });
}

export function useWebhookMetrics() {
  return useQuery({
    queryKey: [...queryKeys.iap.webhooks, 'metrics'],
    queryFn: ({ signal }) => iapService.webhookMetrics(signal),
  });
}

export function useRetryWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (webhookId: string) => iapService.retryWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.iap.webhooks });
    },
  });
}

// Trust hooks
export function useTrustEvents(page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<TrustEvent>>({
    queryKey: [...queryKeys.trust.events, page, pageSize],
    queryFn: ({ signal }) => trustService.events(page, pageSize, signal),
  });
}

export function useLowTrustCompanies() {
  return useQuery<LowTrustCompany[]>({
    queryKey: queryKeys.trust.lowTrust,
    queryFn: ({ signal }) => trustService.lowTrustCompanies(signal),
  });
}

export function useCompanyTrustHistory(companyId: string) {
  return useQuery<TrustEvent[]>({
    queryKey: [...queryKeys.trust.all, 'history', companyId],
    queryFn: ({ signal }) => trustService.companyHistory(companyId, signal),
    enabled: !!companyId,
  });
}

export function useRecalculateTrustScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (companyId: string) => trustService.recalculateTrustScore(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trust.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}

export function useAdjustTrustScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, score, reason }: { companyId: string; score: number; reason: string }) =>
      trustService.adjustTrustScore(companyId, score, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trust.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
    },
  });
}

// Matches hooks
export function useMatches(filters: { status?: string }, page: number = 1, pageSize: number = 20) {
  return useQuery<PaginatedResponse<Match>>({
    queryKey: queryKeys.matches.list({ ...filters, page, pageSize }),
    queryFn: ({ signal }) => matchService.list(filters, page, pageSize, signal),
  });
}

export function useMatchStats() {
  return useQuery({
    queryKey: ['matches', 'stats'],
    queryFn: ({ signal }) => matchService.stats(signal),
  });
}

// TODO: Implement backend routes for applications management
// Backend routes /admin/applications and /admin/applications/stats do not exist yet
// Uncomment and implement when backend routes are created
//
// export function useApplications(filters: { status?: string; companyId?: string }, page: number = 1, pageSize: number = 20) {
//   return useQuery({
//     queryKey: ['applications', 'list', filters, page, pageSize],
//     queryFn: ({ signal }) => matchService.applications(filters, page, pageSize, signal),
//   });
// }
//
// export function useApplicationStats() {
//   return useQuery({
//     queryKey: ['applications', 'stats'],
//     queryFn: ({ signal }) => matchService.applicationStats(signal),
//   });
// }

// ─── Admin Users Hooks ───────────────────────────────────────────
import { adminUserService, type AdminUser, type AdminUserFilters, type CreateAdminUserRequest, type UpdateRoleRequest } from '@/services/adminUserService';

export const adminUserKeys = {
  all: ['admin-users'] as const,
  lists: () => [...adminUserKeys.all, 'list'] as const,
  list: (filters: AdminUserFilters & { page?: number; pageSize?: number }) => [...adminUserKeys.lists(), filters] as const,
  detail: (id: string) => [...adminUserKeys.all, 'detail', id] as const,
};

export function useAdminUsers(
  filters: AdminUserFilters = {},
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: adminUserKeys.list({ ...filters, page, pageSize }),
    queryFn: ({ signal }) => adminUserService.list(filters, page, pageSize, signal),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: adminUserKeys.detail(id),
    queryFn: ({ signal }) => adminUserService.get(id, signal),
    enabled: !!id,
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAdminUserRequest) => adminUserService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}

export function useUpdateAdminUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoleRequest }) =>
      adminUserService.updateRole(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(variables.id) });
    },
  });
}

export function useDeactivateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUserService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}

export function useReactivateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUserService.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}

export function useResendAdminInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUserService.resendInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}

export function useRevokeAdminInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUserService.revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}

// ─── Audit Logs Hooks ────────────────────────────────────────────
import { auditService, type AuditLog, type AuditLogFilters } from '@/services/auditService';

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: AuditLogFilters & { page?: number; pageSize?: number }) => [...auditKeys.lists(), filters] as const,
  detail: (id: string) => [...auditKeys.all, 'detail', id] as const,
  actionTypes: ['audit', 'action-types'] as const,
};

export function useAuditLogs(
  filters: AuditLogFilters = {},
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: auditKeys.list({ ...filters, page, pageSize }),
    queryFn: ({ signal }) => auditService.list(filters, page, pageSize, signal),
  });
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: auditKeys.detail(id),
    queryFn: ({ signal }) => auditService.get(id, signal),
    enabled: !!id,
  });
}

export function useAuditActionTypes() {
  return useQuery({
    queryKey: auditKeys.actionTypes,
    queryFn: ({ signal }) => auditService.getActionTypes(signal),
  });
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: (filters: AuditLogFilters) => auditService.export(filters),
  });
}
