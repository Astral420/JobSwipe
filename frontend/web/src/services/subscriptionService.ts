import api, { buildParams } from '@/lib/api';
import type { Subscription, PaginatedResponse } from '@/types';

interface SubscriptionFilters {
  status?: string;
  tier?: string;
  subscriberType?: string;
  paymentProvider?: string;
  search?: string;
}

interface RevenueStats {
  mrr: number;
  churnRate: number;
  tierDistribution: Record<string, number>;
  totalRevenue: number;
  activeSubscriptions: number;
}

export const subscriptionService = {
  list: async (
    filters: SubscriptionFilters,
    page: number = 1,
    pageSize: number = 20,
    signal?: AbortSignal
  ): Promise<PaginatedResponse<Subscription>> => {
    const params = buildParams({ ...filters, page, pageSize });
    const { data } = await api.get<{ success: boolean; data: PaginatedResponse<Subscription> }>(
      `/admin/subscriptions?${params}`,
      { signal }
    );
    return data.data;
  },

  get: async (id: string, signal?: AbortSignal): Promise<Subscription> => {
    const { data } = await api.get<{ success: boolean; data: Subscription }>(
      `/admin/subscriptions/${id}`,
      { signal }
    );
    return data.data;
  },

  cancel: async (subscriptionId: string, reason: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ success: boolean; message: string }>(
      `/admin/subscriptions/${subscriptionId}/cancel`,
      { reason }
    );
    return { message: data.message };
  },

  revenueStats: async (signal?: AbortSignal): Promise<RevenueStats> => {
    const { data } = await api.get<{ success: boolean; data: RevenueStats }>(
      '/admin/subscriptions/revenue-stats',
      { signal }
    );
    return data.data;
  },
};
