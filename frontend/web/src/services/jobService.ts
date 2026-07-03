import api, { buildParams } from '@/lib/api';
import type { JobPosting, JobFilters, PaginatedResponse } from '@/types';

export const jobService = {
  list: async (
    filters: JobFilters,
    page: number = 1,
    pageSize: number = 20,
    signal?: AbortSignal
  ): Promise<PaginatedResponse<JobPosting>> => {
    const params = buildParams({ ...filters, page, pageSize });
    const { data } = await api.get<{ success: boolean; data: PaginatedResponse<JobPosting> }>(
      `/admin/jobs?${params}`,
      { signal }
    );
    return data.data;
  },

  get: async (id: string, signal?: AbortSignal): Promise<JobPosting> => {
    const { data } = await api.get<{ success: boolean; data: JobPosting }>(
      `/admin/jobs/${id}`,
      { signal }
    );
    return data.data;
  },

  flag: async (jobId: string, reason: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ success: boolean; message: string }>(
      `/admin/jobs/${jobId}/flag`,
      { reason }
    );
    return { message: data.message };
  },

  unflag: async (jobId: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ success: boolean; message: string }>(
      `/admin/jobs/${jobId}/unflag`
    );
    return { message: data.message };
  },

  close: async (jobId: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ success: boolean; message: string }>(
      `/admin/jobs/${jobId}/close`
    );
    return { message: data.message };
  },
};
