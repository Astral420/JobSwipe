<?php

use App\Http\Controllers\Admin\AdminAnalyticsController;
use App\Http\Controllers\Admin\AdminCompanyVerificationController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminIAPController;
use App\Http\Controllers\Admin\AdminJobController;
use App\Http\Controllers\Admin\AdminMatchController;
use App\Http\Controllers\Admin\AdminReviewController;
use App\Http\Controllers\Admin\AdminSubscriptionController;
use App\Http\Controllers\Admin\AdminTrustController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Applicant\ApplicationController;
use App\Http\Controllers\Applicant\MatchController as ApplicantMatchController;
use App\Http\Controllers\Applicant\SwipeController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\OAuthController;
use App\Http\Controllers\Company\ApplicantReviewController;
use App\Http\Controllers\Company\CompanyInviteController;
use App\Http\Controllers\Company\JobPostingController;
use App\Http\Controllers\Company\MatchController as CompanyMatchController;
use App\Http\Controllers\File\FileUploadController;
use App\Http\Controllers\IAP\IAPController;
use App\Http\Controllers\Match\MatchMessageController;
use App\Http\Controllers\Notification\NotificationController;
use App\Http\Controllers\Profile\HRProfileController;
use App\Http\Controllers\Profile\ProfileController;
use App\Http\Controllers\Review\ReviewController;
use App\Http\Controllers\Subscription\SubscriptionController;
use App\Http\Controllers\Webhook\AppleWebhookController;
use App\Http\Controllers\Webhook\GoogleWebhookController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Health check endpoint - no middleware for CI/CD testing
Route::get('/health', function (Request $request) {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now(),
        'app' => config('app.name'),
        'env' => config('app.env'),
    ]);
});

Route::middleware('throttle:api-tiered')->group(function () {

    Route::prefix('v1')->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/check-company-domain', [AuthController::class, 'checkCompanyDomain']);
        Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
        Route::post('auth/verify-email', [AuthController::class, 'verifyEmail'])->middleware('throttle:3,1');
        Route::post('auth/resend-verification', [AuthController::class, 'resendVerification']);

        Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);

        Route::get('auth/google/redirect', [OAuthController::class, 'redirectToGoogle']);
        Route::get('auth/google/callback', [OAuthController::class, 'handleGoogleCallback']);

        // ── Public company invite validation — rate-limited per IP (Req 19 AC 3)
        Route::post(
            'company/invites/validate',
            [CompanyInviteController::class, 'validate']
        )->middleware('throttle:magic-link-validate');

        // ── Admin invitation acceptance (public routes)
        Route::prefix('admin/invitations')->group(function () {
            Route::post('validate', [\App\Http\Controllers\Admin\AdminInvitationController::class, 'validate'])->middleware('throttle:5,1');
            Route::post('accept', [\App\Http\Controllers\Admin\AdminInvitationController::class, 'accept'])->middleware('throttle:3,1');
        });

        Route::post('webhooks/stripe', [SubscriptionController::class, 'handleWebhook']);
        Route::post('webhooks/apple-iap', [AppleWebhookController::class, 'handleNotification']);
        Route::post('webhooks/google-play', [GoogleWebhookController::class, 'handleNotification']);

        Route::middleware('auth:sanctum', 'verified')->group(function () {
            Route::post('auth/logout', [AuthController::class, 'logout']);
            Route::get('auth/me', [AuthController::class, 'me']);

            Route::prefix('files')->group(function () {
                Route::post('upload-url', [FileUploadController::class, 'generateUploadUrl']);
                Route::post('read-url', [FileUploadController::class, 'generateReadUrl']);
                Route::post('confirm-upload', [FileUploadController::class, 'confirmUpload']);
            });

            Route::prefix('notifications')->group(function () {
                Route::get('/', [NotificationController::class, 'index']);
                Route::get('/unread', [NotificationController::class, 'unread']);
                Route::patch('/{id}/read', [NotificationController::class, 'markAsRead']);
                Route::patch('/read-all', [NotificationController::class, 'markAllAsRead']);
                Route::get('/preferences', [NotificationController::class, 'getPreferences']);
                Route::patch('/preferences', [NotificationController::class, 'updatePreferences']);
            });

            Route::prefix('profile')->group(function () {
                Route::middleware('role:applicant')->prefix('applicant')->group(function () {
                    Route::get('/', [ProfileController::class, 'getApplicantProfile']);
                    Route::patch('basic-info', [ProfileController::class, 'updateApplicantBasicInfo']);
                    Route::patch('skills', [ProfileController::class, 'updateApplicantSkills']);
                    Route::patch('job-preferences', [ProfileController::class, 'updateJobPreferences']);
                    Route::post('experience', [ProfileController::class, 'addWorkExperience']);
                    Route::patch('experience/{index}', [ProfileController::class, 'updateWorkExperience']);
                    Route::delete('experience/{index}', [ProfileController::class, 'removeWorkExperience']);
                    Route::post('education', [ProfileController::class, 'addEducation']);
                    Route::patch('education/{index}', [ProfileController::class, 'updateEducation']);
                    Route::delete('education/{index}', [ProfileController::class, 'removeEducation']);
                    Route::patch('resume', [ProfileController::class, 'updateApplicantResume']);
                    Route::patch('cover-letter', [ProfileController::class, 'updateApplicantCoverLetter']);
                    Route::patch('photo', [ProfileController::class, 'updateApplicantPhoto']);
                    Route::patch('cover-photo', [ProfileController::class, 'updateApplicantCoverPhoto']);
                    Route::patch('photos', [ProfileController::class, 'updateApplicantPhotos']);
                    Route::patch('social-links', [ProfileController::class, 'updateSocialLinks']);
                    Route::patch('portfolio', [ProfileController::class, 'updateApplicantPortfolio']);
                });

                Route::middleware('role:hr,company_admin', 'membership.active')->prefix('company')->group(function () {
                    Route::get('/', [ProfileController::class, 'getCompanyProfile']);
                    Route::patch('details', [ProfileController::class, 'updateCompanyDetails']);
                    Route::patch('logo', [ProfileController::class, 'updateCompanyLogo']);
                    Route::post('office-images', [ProfileController::class, 'addOfficeImage']);
                    Route::delete('office-images/{index}', [ProfileController::class, 'removeOfficeImage']);
                });

                Route::middleware('role:company_admin')->prefix('company')->group(function () {
                    Route::post('verification', [ProfileController::class, 'submitVerificationDocuments']);
                });

                Route::get('onboarding/status', [ProfileController::class, 'getOnboardingStatus']);
                Route::post('onboarding/complete-step', [ProfileController::class, 'completeOnboardingStep']);
                Route::get('completion', [ProfileController::class, 'getProfileCompletion']);

                // ── HR Profile (Req 4, Req 17) ───────────────────────────────────────
                Route::middleware('role:hr', 'membership.active')->prefix('hr')->group(function () {
                    Route::post('setup', [HRProfileController::class, 'setup'])
                        ->middleware('throttle:hr-profile-setup');
                    Route::post('photo-upload-url', [HRProfileController::class, 'photoUploadUrl']);
                });
            });

            Route::prefix('subscriptions')->group(function () {
                Route::middleware('role:hr,company_admin')->post('checkout', [SubscriptionController::class, 'createCheckoutSession']);
                Route::middleware('role:hr,company_admin')->get('status', [SubscriptionController::class, 'getSubscriptionStatus']);
                Route::middleware('role:company_admin')->post('cancel', [SubscriptionController::class, 'cancelSubscription']);
            });

            Route::prefix('iap')->group(function () {
                Route::middleware('role:applicant')->post('purchase', [IAPController::class, 'purchase']);
            });

            Route::prefix('applicant')->group(function () {
                Route::middleware('role:applicant')->get('subscription/status', [IAPController::class, 'getSubscriptionStatus']);
                Route::middleware('role:applicant')->get('purchases', [IAPController::class, 'getPurchaseHistory']);
                Route::middleware('role:applicant')->post('subscription/cancel', [IAPController::class, 'cancelSubscription']);
            });

            Route::middleware('role:hr,company_admin', 'membership.active')->prefix('company')->group(function () {
                // Aggregate: applicants across ALL company jobs — must precede apiResource
                // to prevent 'applicants' being swallowed by the {id} wildcard.
                Route::get('jobs/applicants', [ApplicantReviewController::class, 'getAllApplicants']);

                Route::apiResource('jobs', JobPostingController::class);
                Route::post('jobs/{id}/close', [JobPostingController::class, 'close']);
                Route::post('jobs/{id}/restore', [JobPostingController::class, 'restore']);

                Route::prefix('jobs/{jobId}/applicants')->group(function () {
                    Route::get('/', [ApplicantReviewController::class, 'getApplicants']);
                    Route::get('{applicantId}', [ApplicantReviewController::class, 'getApplicantDetail']);
                    Route::post('{applicantId}/right', [ApplicantReviewController::class, 'swipeRight']);
                    Route::post('{applicantId}/left', [ApplicantReviewController::class, 'swipeLeft']);
                });

                // ── Company Invites (company_admin only) ──────────────────────────
                Route::middleware('role:company_admin')->prefix('invites')->group(function () {
                    Route::post('/', [\App\Http\Controllers\Company\CompanyInviteController::class, 'store'])
                        ->middleware('throttle:invite-create');
                    Route::post('bulk', [\App\Http\Controllers\Company\CompanyInviteController::class, 'bulkStore'])
                        ->middleware('throttle:invite-create');
                    Route::get('/', [\App\Http\Controllers\Company\CompanyInviteController::class, 'index']);
                    Route::delete('{inviteId}', [\App\Http\Controllers\Company\CompanyInviteController::class, 'destroy']);
                    Route::post('{inviteId}/resend', [\App\Http\Controllers\Company\CompanyInviteController::class, 'resend']);
                });

                // ── Company Members (company_admin only) ──────────────────────────
                Route::middleware('role:company_admin')->prefix('members')->group(function () {
                    Route::get('/', [\App\Http\Controllers\Company\CompanyMemberController::class, 'index']);
                    Route::delete('{userId}/revoke', [\App\Http\Controllers\Company\CompanyMemberController::class, 'revoke']);
                });
            });

            Route::middleware('role:applicant')->prefix('applicant/swipe')->group(function () {
                Route::get('deck', [SwipeController::class, 'getDeck']);
                Route::get('limits', [SwipeController::class, 'getLimits']);

                Route::middleware('swipe.limit')->group(function () {
                    Route::post('right/{jobId}', [SwipeController::class, 'swipeRight']);
                    Route::post('left/{jobId}', [SwipeController::class, 'swipeLeft']);
                });
            });

            // ── Applicant Applications (§11.3 - previously missing endpoint) ──
            Route::middleware('role:applicant')->prefix('applicant')->group(function () {
                Route::get('applications', [ApplicationController::class, 'index']);
                Route::get('applications/{id}', [ApplicationController::class, 'show']);
            });

            // ── Applicant Matches ─────────────────────────────────────────────
            Route::middleware('role:applicant')->prefix('applicant/matches')->group(function () {
                Route::get('/', [ApplicantMatchController::class, 'index']);
                Route::get('{id}', [ApplicantMatchController::class, 'show']);
                Route::post('{id}/accept', [ApplicantMatchController::class, 'accept']);
                Route::post('{id}/decline', [ApplicantMatchController::class, 'decline']);
            });

            // ── HR/Company Matches ────────────────────────────────────────────
            Route::middleware('role:hr,company_admin', 'membership.active')->prefix('company/matches')->group(function () {
                Route::get('/', [CompanyMatchController::class, 'index']);
                Route::get('{id}', [CompanyMatchController::class, 'show']);
                Route::post('{id}/close', [CompanyMatchController::class, 'close']);
            });

            // ── Match Messages (shared by both applicant and HR) ──────────────
            Route::prefix('matches/{matchId}/messages')->group(function () {
                Route::get('/', [MatchMessageController::class, 'index']);
                Route::post('/', [MatchMessageController::class, 'store'])->middleware('throttle:match-messages-send');
                Route::post('typing', [MatchMessageController::class, 'typing'])->middleware('throttle:match-messages-typing');
                Route::patch('read', [MatchMessageController::class, 'markAsRead'])->middleware('throttle:match-messages-read');
            });

            // ── Company Reviews ───────────────────────────────────────────────
            Route::prefix('reviews')->group(function () {
                Route::middleware('role:applicant')->post('/', [ReviewController::class, 'store']);
                Route::get('company/{companyId}', [ReviewController::class, 'index']);
                Route::post('{id}/flag', [ReviewController::class, 'flag']);
            });

            // ── Admin Review Moderation ───────────────────────────────────────
            Route::prefix('admin/reviews')->group(function () {
                // List all reviews with filtering - accessible by moderator, admin, super_admin
                Route::middleware('role:moderator,admin,super_admin')->get('/', [AdminReviewController::class, 'index']);

                // View flagged reviews - accessible by moderator, admin, super_admin
                Route::middleware('role:moderator,admin,super_admin')->get('flagged', [AdminReviewController::class, 'getFlaggedReviews']);

                // Unflag and remove reviews - accessible by admin, super_admin only
                Route::middleware('role:admin,super_admin')->group(function () {
                    Route::post('{id}/unflag', [AdminReviewController::class, 'unflag']);
                    Route::delete('{id}', [AdminReviewController::class, 'remove']);
                });
            });

            // ── Admin Job Posting Management ──────────────────────────────────
            Route::prefix('admin/jobs')->group(function () {
                // View endpoints - accessible by moderator, admin, super_admin
                Route::middleware('role:moderator,admin,super_admin')->group(function () {
                    Route::get('/', [AdminJobController::class, 'index']);
                    Route::get('{id}', [AdminJobController::class, 'show']);
                });

                // Moderation endpoints - accessible by admin, super_admin
                Route::middleware('role:admin,super_admin')->group(function () {
                    Route::post('{id}/flag', [AdminJobController::class, 'flag']);
                    Route::post('{id}/unflag', [AdminJobController::class, 'unflag']);
                    Route::post('{id}/close', [AdminJobController::class, 'close']);
                });

                // Destructive endpoint - accessible by super_admin only
                Route::middleware('role:super_admin')->group(function () {
                    Route::delete('{id}/force', [JobPostingController::class, 'forceDestroy']);
                });
            });

            // ── Admin: Verification, User lookup, Dashboard (moderator + super_admin) ──
            Route::middleware('role:moderator,admin,super_admin')->prefix('admin')->group(function () {
                Route::get('dashboard/stats', [AdminDashboardController::class, 'stats']);

                // ── Admin Analytics Endpoints ──────────────────────────────────
                Route::prefix('dashboard')->group(function () {
                    Route::get('user-growth', [AdminAnalyticsController::class, 'userGrowthData']);
                    Route::get('revenue', [AdminAnalyticsController::class, 'revenueData']);
                    Route::get('activity', [AdminAnalyticsController::class, 'recentActivity']);
                });

                // ── Admin Company Verification Viewing (moderator can view) ───
                Route::prefix('companies/verifications')->group(function () {
                    Route::get('/', [AdminCompanyVerificationController::class, 'index']);
                    Route::get('{companyId}', [AdminCompanyVerificationController::class, 'show']);
                });

                // ── Admin Company Management Endpoints ─────────────────────────
                Route::prefix('companies')->group(function () {
                    Route::get('/', [\App\Http\Controllers\Admin\AdminCompanyController::class, 'index']);
                    Route::get('{id}', [\App\Http\Controllers\Admin\AdminCompanyController::class, 'show']);
                });
            });

            // ── Admin: Company Verification Actions (admin + super_admin) ─────
            Route::middleware('role:admin,super_admin')->prefix('admin/companies/verifications')->group(function () {
                Route::post('{companyId}/approve', [AdminCompanyVerificationController::class, 'approve']);
                Route::post('{companyId}/reject', [AdminCompanyVerificationController::class, 'reject']);
            });

            // ── Admin: Subscription, IAP, Trust, User Management (moderator + admin + super_admin) ──
            Route::middleware('role:moderator,admin,super_admin')->prefix('admin')->group(function () {
                // ── Admin Subscription Management Endpoints ────────────────────
                Route::prefix('subscriptions')->group(function () {
                    Route::get('/', [AdminSubscriptionController::class, 'index']);
                    Route::get('revenue-stats', [AdminSubscriptionController::class, 'revenueStats']);
                    Route::get('{id}', [AdminSubscriptionController::class, 'show']);
                });

                // ── Admin IAP Transaction Management Endpoints ─────────────────
                Route::prefix('iap')->group(function () {
                    Route::get('transactions', [AdminIAPController::class, 'transactions']);
                    Route::get('transactions/{transactionId}', [AdminIAPController::class, 'transactionDetail']);
                    Route::get('webhooks', [AdminIAPController::class, 'webhookEvents']);
                    Route::get('webhooks/metrics', [AdminIAPController::class, 'webhookMetrics']);
                    Route::post('webhooks/{eventId}/retry', [AdminIAPController::class, 'retryWebhook']);
                });

                // ── Admin Trust System Management Endpoints ────────────────────
                Route::prefix('trust')->group(function () {
                    Route::get('events', [AdminTrustController::class, 'trustEvents']);
                    Route::get('low-trust-companies', [AdminTrustController::class, 'lowTrustCompanies']);
                    Route::get('companies/{companyId}/history', [AdminTrustController::class, 'companyTrustHistory']);
                    Route::post('companies/{companyId}/recalculate', [AdminTrustController::class, 'recalculateTrustScore']);
                    Route::post('companies/{companyId}/adjust', [AdminTrustController::class, 'adjustTrustScore']);
                });

                // ── Admin User Management Endpoints ────────────────────────────
                Route::get('users', [AdminUserController::class, 'index']);
                Route::get('users/{id}', [AdminUserController::class, 'show']);

                // ── Admin Match Management Endpoints ───────────────────────────
                Route::prefix('matches')->group(function () {
                    Route::get('/', [AdminMatchController::class, 'index']);
                    Route::get('stats', [AdminMatchController::class, 'stats']);
                    Route::get('{id}', [AdminMatchController::class, 'show']);
                });
            });

            // ── Admin: Destructive user actions (super_admin only) ────────────
            Route::middleware('role:super_admin')->prefix('admin')->group(function () {
                Route::post('users/{id}/ban', [AdminUserController::class, 'ban']);
                Route::post('users/{id}/unban', [AdminUserController::class, 'unban']);

                // ── Admin Company Destructive Actions ──────────────────────────
                Route::prefix('companies')->group(function () {
                    Route::post('{id}/suspend', [\App\Http\Controllers\Admin\AdminCompanyController::class, 'suspend']);
                    Route::post('{id}/unsuspend', [\App\Http\Controllers\Admin\AdminCompanyController::class, 'unsuspend']);
                });

                // ── Admin Subscription Destructive Actions ─────────────────────
                Route::prefix('subscriptions')->group(function () {
                    Route::post('{id}/cancel', [AdminSubscriptionController::class, 'cancel']);
                });

                // ── Admin User Management (super_admin only) ───────────────────
                Route::prefix('admin-users')->group(function () {
                    Route::get('/', [\App\Http\Controllers\Admin\AdminUserManagementController::class, 'index']);
                    Route::get('{id}', [\App\Http\Controllers\Admin\AdminUserManagementController::class, 'show']);
                    Route::post('/', [\App\Http\Controllers\Admin\AdminUserManagementController::class, 'store']);
                    Route::patch('{id}/role', [\App\Http\Controllers\Admin\AdminUserManagementController::class, 'updateRole']);
                    Route::post('{id}/deactivate', [\App\Http\Controllers\Admin\AdminUserManagementController::class, 'deactivate']);
                    Route::post('{id}/reactivate', [\App\Http\Controllers\Admin\AdminUserManagementController::class, 'reactivate']);
                    Route::post('{id}/resend-invitation', [\App\Http\Controllers\Admin\AdminUserManagementController::class, 'resendInvitation']);
                    Route::post('{id}/revoke-invitation', [\App\Http\Controllers\Admin\AdminUserManagementController::class, 'revokeInvitation']);
                });

                // ── Audit Logs (super_admin can view all) ─────────────────────
                Route::prefix('audit')->group(function () {
                    Route::get('/', [\App\Http\Controllers\Admin\AdminAuditLogController::class, 'index']);
                    Route::get('action-types', [\App\Http\Controllers\Admin\AdminAuditLogController::class, 'actionTypes']);
                    Route::get('{id}', [\App\Http\Controllers\Admin\AdminAuditLogController::class, 'show']);
                    Route::post('export', [\App\Http\Controllers\Admin\AdminAuditLogController::class, 'export']);
                });
            });

            // ── Audit Logs (moderator/admin can view own) ─────────────────────
            Route::middleware('role:moderator,admin')->prefix('admin/audit')->group(function () {
                Route::get('/', [\App\Http\Controllers\Admin\AdminAuditLogController::class, 'index']);
                Route::get('{id}', [\App\Http\Controllers\Admin\AdminAuditLogController::class, 'show']);
            });
        });
    });
});
