import api, { buildParams } from '@/lib/api';
import type { PaginatedResponse } from '@/types';

// ─── Admin User Types ────────────────────────────────────────────
export interface AdminUser {
    id: string;
    email: string;
    name?: string;
    role: 'super_admin' | 'admin' | 'moderator';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
    emailVerifiedAt?: string;
}

export interface AdminUserFilters {
    role?: 'super_admin' | 'admin' | 'moderator';
    isActive?: boolean;
}

export interface AdminUserDetail extends AdminUser {
    recentActions?: any[];
    invitation?: {
        id: string;
        token: string;
        expiresAt: string;
        acceptedAt?: string;
        revokedAt?: string;
    };
    activeTokensCount?: number;
}

export interface CreateAdminUserRequest {
    email: string;
    role: 'admin' | 'moderator';
}

export interface UpdateRoleRequest {
    role: 'super_admin' | 'admin' | 'moderator';
}

// ─── Admin User Service ──────────────────────────────────────────
export const adminUserService = {
    /**
     * List all admin users with filtering
     */
    list: async (
        filters: AdminUserFilters,
        page: number = 1,
        pageSize: number = 20,
        signal?: AbortSignal
    ): Promise<PaginatedResponse<AdminUser>> => {
        const params = buildParams({ ...filters, page, pageSize });
        const { data } = await api.get<PaginatedResponse<AdminUser>>(
            `/admin/admin-users?${params}`,
            { signal }
        );
        return data;
    },

    /**
     * Get admin user details
     */
    get: async (
        id: string,
        signal?: AbortSignal
    ): Promise<AdminUserDetail> => {
        const { data } = await api.get<AdminUserDetail>(
            `/admin/admin-users/${id}`,
            { signal }
        );
        return data;
    },

    /**
     * Create a new admin user (sends invitation)
     */
    create: async (
        payload: CreateAdminUserRequest
    ): Promise<{ user: AdminUser; invitation: any; message: string }> => {
        const { data } = await api.post<{ user: AdminUser; invitation: any; message: string }>(
            '/admin/admin-users',
            payload
        );
        return data;
    },

    /**
     * Update admin user role
     */
    updateRole: async (
        id: string,
        payload: UpdateRoleRequest
    ): Promise<{ user: AdminUser; message: string }> => {
        const { data } = await api.patch<{ user: AdminUser; message: string }>(
            `/admin/admin-users/${id}/role`,
            payload
        );
        return data;
    },

    /**
     * Deactivate admin user
     */
    deactivate: async (
        id: string
    ): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/admin-users/${id}/deactivate`
        );
        return data;
    },

    /**
     * Reactivate admin user
     */
    reactivate: async (
        id: string
    ): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/admin-users/${id}/reactivate`
        );
        return data;
    },

    /**
     * Resend invitation email
     */
    resendInvitation: async (
        id: string
    ): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/admin-users/${id}/resend-invitation`
        );
        return data;
    },

    /**
     * Revoke invitation
     */
    revokeInvitation: async (
        id: string
    ): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/admin-users/${id}/revoke-invitation`
        );
        return data;
    },
};
