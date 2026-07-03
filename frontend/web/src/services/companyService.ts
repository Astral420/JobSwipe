import api, { buildParams } from '@/lib/api';

import type {
    Company,
    CompanyVerification,
    CompanyFilters,
    PaginatedResponse
} from '@/types';

/**
 * The Axios interceptor in api.ts already handles:
 *   1. Unwrapping { success, data, message } envelope
 *   2. camelCasing all keys
 *   3. Normalising Laravel paginators → { data, total, page, pageSize, totalPages }
 *
 * Do NOT double-unwrap with data.data here.
 */
export const companyService = {

    list: async (
        filters: CompanyFilters,
        page: number = 1,
        pageSize: number = 20,
        signal?: AbortSignal
    ): Promise<PaginatedResponse<Company>> => {
        const params = buildParams({ ...filters, page, pageSize });
        const { data } = await api.get<PaginatedResponse<Company>>(
            `/admin/companies?${params}`, { signal }
        );
        return data;
    },

    get: async (
        id: string,
        signal?: AbortSignal
    ): Promise<Company> => {
        const { data } = await api.get<Company>(
            `/admin/companies/${id}`, { signal }
        );
        return data;
    },

    suspend: async (
        companyId: string,
        reason: string
    ): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/companies/${companyId}/suspend`,
            { reason }
        );
        return data;
    },

    unsuspend: async (companyId: string): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/companies/${companyId}/unsuspend`
        );
        return data;
    },

    verifications: async (
        signal?: AbortSignal
    ): Promise<PaginatedResponse<CompanyVerification>> => {
        const { data } = await api.get<PaginatedResponse<CompanyVerification>>(
            `/admin/companies/verifications`, { signal }
        );
        return data;
    },

    rejectVerification: async (
        verificationId: string,
        reason: string
    ): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/companies/verifications/${verificationId}/reject`,
            { reason }
        );
        return data;
    },

    approveVerification: async (verificationId: string): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/companies/verifications/${verificationId}/approve`
        );
        return data;
    },
};
