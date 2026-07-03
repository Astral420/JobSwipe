import api, { buildParams } from '@/lib/api';
import type { TrustEvent, LowTrustCompany, PaginatedResponse } from '@/types';

export const trustService = {
  events: async (
    page: number = 1,
    pageSize: number = 20,
    signal?: AbortSignal
  ): Promise<PaginatedResponse<TrustEvent>> => {
    const params = buildParams({ page, pageSize });
    const { data } = await api.get<PaginatedResponse<TrustEvent>>(
      `/admin/trust/events?${params}`,
      { signal }
    );
    return data;
  },

  lowTrustCompanies: async (signal?: AbortSignal): Promise<LowTrustCompany[]> => {
    const { data } = await api.get<LowTrustCompany[]>(
      '/admin/trust/low-trust-companies',
      { signal }
    );
    return data || [];
  },

  companyHistory: async (companyId: string, signal?: AbortSignal): Promise<TrustEvent[]> => {
    const { data } = await api.get<TrustEvent[]>(
      `/admin/trust/companies/${companyId}/history`,
      { signal }
    );
    return data || [];
  },

  recalculateTrustScore: async (companyId: string): Promise<{ newTrustScore: number }> => {
    const { data } = await api.post<{ companyId: string; newTrustScore: number }>(
      `/admin/trust/companies/${companyId}/recalculate`
    );
    return { newTrustScore: data.newTrustScore };
  },

  adjustTrustScore: async (
    companyId: string,
    score: number,
    reason: string
  ): Promise<{ newScore: number }> => {
    const { data } = await api.post<{ companyId: string; newScore: number }>(
      `/admin/trust/companies/${companyId}/adjust`,
      { score, reason }
    );
    return { newScore: data.newScore };
  },
};
