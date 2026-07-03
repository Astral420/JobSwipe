import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

// ─── Configuration ──────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const REQUEST_TIMEOUT = 30_000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // ms — exponential backoff base

// ─── Typed API Error ────────────────────────────────────────────
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>; // Laravel validation format
  code?: string;
}

export class ApiServiceError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;
  public readonly code?: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiServiceError';
    this.status = error.status;
    this.errors = error.errors;
    this.code = error.code;
  }

  /** Check if this is a validation error (422) */
  get isValidation(): boolean {
    return this.status === 422;
  }

  /** Check if this is an auth error (401/403) */
  get isAuth(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** Check if the server is down (5xx) */
  get isServer(): boolean {
    return this.status >= 500;
  }

  /** Get first validation error for a field */
  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0];
  }
}

// ─── Retry Logic ────────────────────────────────────────────────
function shouldRetry(error: AxiosError, retryCount: number): boolean {
  if (retryCount >= MAX_RETRIES) return false;
  // Retry only on network errors or 5xx (not on 4xx client errors)
  if (!error.response) return true; // network error
  return error.response.status >= 500;
}

function getRetryDelay(retryCount: number): number {
  return RETRY_DELAY_BASE * Math.pow(2, retryCount); // 1s, 2s, 4s
}

// ─── Axios Instance ─────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: REQUEST_TIMEOUT,
});

// ─── Request Interceptor ────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Transform Helpers ─────────────────────────────────

/** snake_case → camelCase for a single key */
function toCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Recursively convert all object keys from snake_case to camelCase */
function keysToCamel(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj as object).reduce<Record<string, unknown>>((acc, key) => {
      acc[toCamel(key)] = keysToCamel((obj as Record<string, unknown>)[key]);
      return acc;
    }, {});
  }
  return obj;
}

/** Detect a Laravel LengthAwarePaginator payload (after camelCasing) */
function isLaravelPaginator(data: unknown): data is Record<string, unknown> {
  return (
    data !== null &&
    typeof data === 'object' &&
    'currentPage' in (data as object) &&
    'perPage' in (data as object) &&
    Array.isArray((data as Record<string, unknown>).data)
  );
}

/** Normalise a Laravel paginator to our PaginatedResponse shape */
function normalizePaginator(data: Record<string, unknown>) {
  return {
    data: data.data as unknown[],
    total: (data.total as number) ?? 0,
    page: (data.currentPage as number) ?? 1,
    pageSize: (data.perPage as number) ?? 20,
    totalPages: (data.lastPage as number) ?? 1,
  };
}

/**
 * Full response body transformation pipeline:
 *   1. Unwrap Laravel envelope  { success, data, message }
 *   2. camelCase all keys recursively
 *   3. Normalise Laravel paginator  →  PaginatedResponse shape
 */
function transformResponseData(body: unknown): unknown {
  // Step 1 — unwrap { success, data, message } envelope
  let inner = body;
  if (
    body !== null &&
    typeof body === 'object' &&
    'success' in (body as object) &&
    'data' in (body as object)
  ) {
    inner = (body as Record<string, unknown>).data;
  }

  // Step 2 — camelCase
  const camel = keysToCamel(inner);

  // Step 3 — normalise Laravel paginator
  if (isLaravelPaginator(camel)) {
    return normalizePaginator(camel);
  }

  return camel;
}

// ─── Response Interceptor ───────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (response.data !== undefined) {
      response.data = transformResponseData(response.data);
    }
    return response;
  },
  async (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const config = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number;
    };

    // ── Retry logic for transient failures ──
    const retryCount = config?._retryCount ?? 0;
    if (config && shouldRetry(error, retryCount)) {
      config._retryCount = retryCount + 1;
      await new Promise((r) => setTimeout(r, getRetryDelay(retryCount)));
      return api(config);
    }

    // ── 401 → clear session & redirect ──
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
      }
    }

    // ── Transform to structured ApiServiceError ──
    const status = error.response?.status ?? 0;
    const message =
      error.response?.data?.message ??
      error.message ??
      'An unexpected error occurred';
    const errors = error.response?.data?.errors;

    throw new ApiServiceError({ status, message, errors });
  }
);

// ─── Helper Utilities ───────────────────────────────────────────

/** Build URLSearchParams from a filters object, omitting falsy values */
export function buildParams(
  filters: Record<string, string | number | boolean | undefined | null>
): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params;
}

/** Create an AbortController-backed cancel signal for React Query */
export function createCancelSignal(timeoutMs?: number): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (timeoutMs) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  return {
    signal: controller.signal,
    cancel: () => {
      controller.abort();
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

/** Upload a file with progress tracking */
export async function uploadFile<T = unknown>(
  url: string,
  file: File,
  fieldName: string = 'file',
  extraFields?: Record<string, string>,
  onProgress?: (percentage: number) => void,
): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);

  if (extraFields) {
    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const { data } = await api.post<T>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  });

  return data;
}

export default api;
