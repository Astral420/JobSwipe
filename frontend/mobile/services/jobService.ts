import { api } from './api';

// TODO: Add tests for jobService methods
// Test cases should cover:
// - Successful job creation, update, delete
// - Error handling for validation failures
// - Network error scenarios
// - Optimistic update rollback scenarios

export type JobPayload = {
  title: string;
  description: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_is_hidden?: boolean;
  salary_period?: 'monthly' | 'yearly';
  work_type?: string;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship';
  location?: string;
  location_city?: string;
  location_region?: string;
  interview_template?: string;
  skills?: Array<{ name: string; type: 'hard' | 'soft' }>;
};

export type Job = {
  id: number;
  title: string;
  description: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_is_hidden?: boolean;
  salary_period?: 'monthly' | 'yearly';
  work_type?: string;
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship';
  location?: string;
  location_city?: string;
  location_region?: string;
  interview_template?: string;
  skills?: Array<{ name: string; type: 'hard' | 'soft' }>;
  status: 'active' | 'open' | 'closed' | 'paused';
  applicants_count?: number;
  created_at?: string;
  updated_at?: string;
};

export const jobService = {
  /**
   * Fetch all jobs for the authenticated company
   */
  list: async (): Promise<Job[]> => {
    const response = (await api.get('/company/jobs')) as any;
    // Interceptor unwraps to the paginated object; .data holds the jobs array
    return response?.data || response || [];
  },

  /**
   * Create a new job posting
   */
  create: async (payload: JobPayload): Promise<Job> => {
    const response = (await api.post('/company/jobs', payload)) as any;
    return response;
  },

  /**
   * Update an existing job posting
   */
  update: async (id: number, payload: Partial<JobPayload>): Promise<Job> => {
    const response = (await api.put(`/company/jobs/${id}`, payload)) as any;
    return response;
  },

  /**
   * Soft delete a job posting (maintains audit trail)
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/company/jobs/${id}`);
  },

  /**
   * Close/pause a job posting
   */
  close: async (id: number): Promise<Job> => {
    const response = (await api.post(`/company/jobs/${id}/close`)) as any;
    return response;
  },

  /**
   * Reopen a closed job posting (sets status back to active)
   */
  reopen: async (id: number): Promise<Job> => {
    const response = (await api.post(`/company/jobs/${id}/reopen`)) as any;
    return response;
  },

  /**
   * Get a single job by ID
   */
  get: async (id: number): Promise<Job> => {
    const response = (await api.get(`/company/jobs/${id}`)) as any;
    return response;
  },
};
