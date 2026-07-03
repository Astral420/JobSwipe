import api, { buildParams } from '@/lib/api';
import type {
    User,
    UserFilters,
    UserStatus,
    PaginatedResponse
} from '@/types';

// ─── Raw backend User shape (after camelCase interceptor) ────────
interface RawUser {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    isBanned: boolean;
    emailVerifiedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string | null;
    bannedAt?: string | null;
    banReason?: string | null;
}

/**
 * Map the raw backend User (no `name`, no `status`) to the
 * frontend User type. The backend User model has `is_active` and
 * `is_banned` instead of a single `status` column.
 */
function transformUser(raw: RawUser): User {
    let status: UserStatus = 'active';
    if (raw.isBanned) {
        status = 'banned';
    } else if (!raw.isActive) {
        status = 'pending';
    }

    return {
        id: raw.id,
        // Backend has no `name` column for admin/moderator accounts — use email
        name: raw.email,
        email: raw.email,
        role: raw.role as User['role'],
        status,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        lastLoginAt: raw.lastLoginAt ?? undefined,
        bannedAt: raw.bannedAt ?? undefined,
        banReason: raw.banReason ?? undefined,
    };
}

export const userService = {
    /**
     * The interceptor already:
     *   1. Unwraps { success, data, message }
     *   2. camelCases all keys
     *   3. Normalises Laravel paginator → { data, total, page, pageSize, totalPages }
     * So `data` here is already PaginatedResponse<RawUser>.
     */
    list: async (
        filters: UserFilters,
        page: number = 1,
        pageSize: number = 20,
        signal?: AbortSignal
    ): Promise<PaginatedResponse<User>> => {
        const params = buildParams({ ...filters, page, pageSize });
        const { data } = await api.get<PaginatedResponse<RawUser>>(
            `/admin/users?${params}`,
            { signal }
        );
        return {
            ...data,
            data: data.data.map(transformUser),
        };
    },

    // Interceptor unwraps the envelope — `data` is already the raw user object
    get: async (
        id: string,
        signal?: AbortSignal
    ): Promise<User> => {
        const { data } = await api.get<RawUser>(
            `/admin/users/${id}`,
            { signal }
        );
        return transformUser(data);
    },

    ban: async (
        userId: string,
        reason: string
    ): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/users/${userId}/ban`,
            { reason }
        );
        return data;
    },

    unban: async (userId: string): Promise<{ message: string }> => {
        const { data } = await api.post<{ message: string }>(
            `/admin/users/${userId}/unban`
        );
        return data;
    },
};