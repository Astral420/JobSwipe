// User types
export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'applicant' | 'hr' | 'company_admin';
export type UserStatus = 'active' | 'banned' | 'suspended' | 'pending';

export interface User {
  id: string;
  name?: string; // not present for admin/moderator accounts — backend has no name column
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  bannedAt?: string;
  banReason?: string;
}

// Company types
export type CompanyVerificationStatus = 'pending' | 'approved' | 'verified' | 'rejected' | 'expired' | 'unverified';
export type CompanyTrustLevel = 'low' | 'medium' | 'high' | 'established';
export type CompanySubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise';
export type CompanyStatus = 'active' | 'suspended' | 'inactive';

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  description?: string;
  logoUrl?: string;
  status: CompanyStatus;
  verificationStatus: CompanyVerificationStatus;
  trustLevel: CompanyTrustLevel;
  trustScore: number;
  subscriptionTier: CompanySubscriptionTier;
  subscriptionId?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  suspendedAt?: string;
}

export interface CompanyVerification {
  id: string;
  companyId: string;
  company: Company;
  status: CompanyVerificationStatus;
  documents: VerificationDocument[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface VerificationDocument {
  id: string;
  type: 'business_license' | 'tax_document' | 'identification' | 'other';
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

// Job types
export type JobStatus = 'active' | 'closed' | 'paused' | 'flagged' | 'deleted';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship';
export type JobLocationType = 'remote' | 'onsite' | 'hybrid';

export interface JobPosting {
  id: string;
  title: string;
  companyId: string;
  company?: Company;
  description: string;
  requirements: string[];
  location: string;
  locationType: JobLocationType;
  type: JobType;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  status: JobStatus;
  flagCount: number;
  applicationCount: number;
  postedAt: string;
  expiresAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Review types
export type ReviewStatus = 'published' | 'flagged' | 'removed' | 'pending';
export type ReviewSentiment = 'positive' | 'neutral' | 'negative';

export interface Review {
  id: string;
  companyId: string;
  company?: Company;
  authorId: string;
  author?: User;
  rating: number;
  title: string;
  content: string;
  sentiment: ReviewSentiment;
  status: ReviewStatus;
  flagCount: number;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  removedAt?: string;
  removedReason?: string;
}

// Subscription types
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due' | 'trialing';
export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'enterprise';

export interface Subscription {
  id: string;
  companyId: string;
  company?: Company;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  cancelReason?: string;
  amount: number;
  currency: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  createdAt: string;
  paidAt?: string;
}

// IAP types
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded';
export type TransactionType = 'purchase' | 'refund' | 'subscription' | 'credit';

export interface IAPTransaction {
  id: string;
  userId: string;
  user?: User;
  type: TransactionType;
  amount: number;
  currency: string;
  productId: string;
  productName: string;
  status: TransactionStatus;
  paymentProvider: 'stripe' | 'paypal' | 'apple' | 'google';
  providerTransactionId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  processedAt?: string;
  refundedAt?: string;
}

export type WebhookStatus = 'pending' | 'delivered' | 'failed' | 'retrying';
export type WebhookEventType = 'subscription.created' | 'subscription.cancelled' | 'payment.succeeded' | 'payment.failed' | 'user.created' | 'user.deleted';

export interface WebhookEvent {
  id: string;
  event: WebhookEventType;
  payload: Record<string, unknown>;
  status: WebhookStatus;
  attempts: number;
  lastAttemptAt?: string;
  deliveredAt?: string;
  nextRetryAt?: string;
  createdAt: string;
}

// Trust types
export type TrustEventType = 'score_changed' | 'verification_completed' | 'flag_added' | 'review_posted' | 'job_closed' | 'manual_adjustment';

export interface TrustEvent {
  id: string;
  companyId: string;
  company?: Company;
  type: TrustEventType;
  description: string;
  scoreChange: number;
  scoreBefore: number;
  scoreAfter: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LowTrustCompany {
  company: Company;
  trustScore: number;
  trustLevel: CompanyTrustLevel;
  recentFlags: number;
  recentNegativeReviews: number;
  pendingVerifications: number;
  lastScoreCalculation: string;
}

// Match types
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

export interface Match {
  id: string;
  userId: string;
  user?: User;
  jobId: string;
  job?: JobPosting;
  companyId: string;
  company?: Company;
  status: MatchStatus;
  matchScore: number;
  appliedAt: string;
  respondedAt?: string;
  expiresAt: string;
  createdAt: string;
}

// Dashboard types
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalCompanies: number;
  activeCompanies: number;
  totalJobs: number;
  activeJobs: number;
  totalRevenue: number;
  monthlyRevenue: number;
  pendingVerifications: number;
  flaggedContent: number;
  lowTrustCompanies: number;
  activeSubscriptions: number;
  criticalTrustCompanies: number;
  recentTrustEvents: number;
  trustByLevel: {
    untrusted: number;
    new: number;
    established: number;
    trusted: number;
  };
}

// Backend API response structure for dashboard stats
export interface DashboardStatsApiResponse {
  users: {
    total: number;
    applicants: number;
    hr: number;
    companyAdmins: number;
    moderators: number;
    superAdmins: number;
    banned: number;
  };
  companies: {
    total: number;
    verified: number;
    pendingVerification: number;
    rejectedVerification: number;
  };
  reviews: {
    total: number;
    flagged: number;
  };
  jobs: {
    total: number;
    active: number;
  };
  trust: {
    lowTrustCompanies: number;
    criticalTrustCompanies: number;
    recentEvents: number;
    byLevel: {
      untrusted: number;
      new: number;
      established: number;
      trusted: number;
    };
  };
}

export interface UserGrowthData {
  date: string;
  users: number;
  companies: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  subscriptions: number;
  iap: number;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Filter types
export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface CompanyFilters {
  verificationStatus?: CompanyVerificationStatus;
  trustLevel?: CompanyTrustLevel;
  subscriptionTier?: CompanySubscriptionTier;
  status?: CompanyStatus;
  search?: string;
}

export interface JobFilters {
  status?: JobStatus;
  type?: JobType;
  locationType?: JobLocationType;
  search?: string;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  sentiment?: ReviewSentiment;
  search?: string;
}
