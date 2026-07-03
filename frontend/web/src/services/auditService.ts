import api, { buildParams } from '@/lib/api';
import type { PaginatedResponse } from '@/types';

// ─── Audit Log Types ─────────────────────────────────────────────
export interface AuditLog {
    id: string;
    actionType: string;
    resourceType: string;
    resourceId: string;
    actorId: string;
    actorRole: string;
    actorEmail?: string;
    metadata?: Record<string, any>;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

export interface AuditLogFilters {
    actionType?: string;
    resourceType?: string;
    resourceId?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface AuditLogDetail extends AuditLog {
    actor?: {
        id: string;
        email: string;
        role: string;
    };
}

// ─── Audit Service ───────────────────────────────────────────────
export const auditService = {
    /**
     * List audit logs with filtering
     */
    list: async (
        filters: AuditLogFilters,
        page: number = 1,
        pageSize: number = 20,
        signal?: AbortSignal
    ): Promise<PaginatedResponse<AuditLog>> => {
        const params = buildParams({ ...filters, page, pageSize });
        const { data } = await api.get<PaginatedResponse<AuditLog>>(
            `/admin/audit?${params}`,
            { signal }
        );
        return data;
    },

    /**
     * Get audit log details
     */
    get: async (
        id: string,
        signal?: AbortSignal
    ): Promise<AuditLogDetail> => {
        const { data } = await api.get<AuditLogDetail>(
            `/admin/audit/${id}`,
            { signal }
        );
        return data;
    },

    /**
     * Get available action types for filtering
     */
    getActionTypes: async (
        signal?: AbortSignal
    ): Promise<string[]> => {
        const { data } = await api.get<string[]>(
            '/admin/audit/action-types',
            { signal }
        );
        return data;
    },

    /**
     * Export audit logs to CSV
     */
    export: async (
        filters: AuditLogFilters
    ): Promise<{ filePath: string; downloadUrl: string; message: string }> => {
        const { data } = await api.post<{ filePath: string; downloadUrl: string; message: string }>(
            '/admin/audit/export',
            filters
        );
        return data;
    },
};
