import api, { buildParams } from '@/lib/api';
import type { IAPTransaction, WebhookEvent, PaginatedResponse } from '@/types';

interface IAPFilters {
  provider?: string;
  status?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

interface WebhookMetrics {
  totalEvents: number;
  successRate: number;
  averageProcessingTime: number;
  failedEvents: number;
}

export const iapService = {
  transactions: async (
    filters: IAPFilters,
    page: number = 1,
    pageSize: number = 20,
    signal?: AbortSignal
  ): Promise<PaginatedResponse<IAPTransaction>> => {
    const params = buildParams({ ...filters, page, pageSize });
    const { data } = await api.get<{ success: boolean; data: PaginatedResponse<IAPTransaction> }>(
      `/admin/iap/transactions?${params}`,
      { signal }
    );
    return data.data;
  },

  transactionDetail: async (transactionId: string, signal?: AbortSignal): Promise<IAPTransaction> => {
    const { data } = await api.get<{ success: boolean; data: IAPTransaction }>(
      `/admin/iap/transactions/${transactionId}`,
      { signal }
    );
    return data.data;
  },

  webhookEvents: async (
    page: number = 1,
    pageSize: number = 20,
    signal?: AbortSignal
  ): Promise<PaginatedResponse<WebhookEvent>> => {
    const params = buildParams({ page, pageSize });
    const { data } = await api.get<{ success: boolean; data: PaginatedResponse<WebhookEvent> }>(
      `/admin/iap/webhooks?${params}`,
      { signal }
    );
    return data.data;
  },

  webhookMetrics: async (signal?: AbortSignal): Promise<WebhookMetrics> => {
    const { data } = await api.get<{ success: boolean; data: WebhookMetrics }>(
      '/admin/iap/webhooks/metrics',
      { signal }
    );
    return data.data;
  },

  retryWebhook: async (eventId: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ success: boolean; message: string }>(
      `/admin/iap/webhooks/${eventId}/retry`
    );
    return { message: data.message };
  },
};
