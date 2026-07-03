# JobSwipe API Routes Reference

## Base URL

`http://localhost:8000/api/v1`

## Response Format

Success:

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

Error:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Auth

| Method | Endpoint | Auth |
| --- | --- | --- |
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| POST | `/auth/verify-email` | No |
| POST | `/auth/resend-verification` | No |
| GET | `/auth/google/redirect` | No |
| GET | `/auth/google/callback` | No |
| POST | `/auth/logout` | Yes |
| GET | `/auth/me` | Yes |

## File Upload

| Method | Endpoint | Auth | Middleware |
| --- | --- | --- | --- |
| POST | `/files/upload-url` | Yes | `auth:sanctum` |
| POST | `/files/read-url` | Yes | `auth:sanctum` |
| POST | `/files/confirm-upload` | Yes | `auth:sanctum` |

## Applicant Profile

| Method | Endpoint | Auth | Middleware |
| --- | --- | --- | --- |
| GET | `/profile/applicant` | Yes | `auth:sanctum`, `role:applicant` |
| PATCH | `/profile/applicant/basic-info` | Yes | `auth:sanctum`, `role:applicant` |
| PATCH | `/profile/applicant/skills` | Yes | `auth:sanctum`, `role:applicant` |
| POST | `/profile/applicant/experience` | Yes | `auth:sanctum`, `role:applicant` |
| PATCH | `/profile/applicant/experience/{index}` | Yes | `auth:sanctum`, `role:applicant` |
| DELETE | `/profile/applicant/experience/{index}` | Yes | `auth:sanctum`, `role:applicant` |
| POST | `/profile/applicant/education` | Yes | `auth:sanctum`, `role:applicant` |
| PATCH | `/profile/applicant/education/{index}` | Yes | `auth:sanctum`, `role:applicant` |
| DELETE | `/profile/applicant/education/{index}` | Yes | `auth:sanctum`, `role:applicant` |
| PATCH | `/profile/applicant/resume` | Yes | `auth:sanctum`, `role:applicant` |
| PATCH | `/profile/applicant/cover-letter` | Yes | `auth:sanctum`, `role:applicant` |
| PATCH | `/profile/applicant/photo` | Yes | `auth:sanctum`, `role:applicant` |
| PATCH | `/profile/applicant/social-links` | Yes | `auth:sanctum`, `role:applicant` |

## Company Profile

| Method | Endpoint | Auth | Middleware |
| --- | --- | --- | --- |
| GET | `/profile/company` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| PATCH | `/profile/company/details` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| PATCH | `/profile/company/logo` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| POST | `/profile/company/office-images` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| DELETE | `/profile/company/office-images/{index}` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| POST | `/profile/company/verification` | Yes | `auth:sanctum`, `role:company_admin` |
| GET | `/profile/onboarding/status` | Yes | `auth:sanctum` |
| POST | `/profile/onboarding/complete-step` | Yes | `auth:sanctum` |
| GET | `/profile/completion` | Yes | `auth:sanctum` |

## Subscriptions

| Method | Endpoint | Auth | Middleware |
| --- | --- | --- | --- |
| POST | `/subscriptions/checkout` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| GET | `/subscriptions/status` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| POST | `/subscriptions/cancel` | Yes | `auth:sanctum`, `role:company_admin` |
| POST | `/webhooks/stripe` | No | Stripe signature verification |

## Company Jobs & Review

| Method | Endpoint | Auth | Middleware |
| --- | --- | --- | --- |
| GET | `/company/jobs` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| POST | `/company/jobs` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| GET | `/company/jobs/{id}` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| PUT/PATCH | `/company/jobs/{id}` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| DELETE | `/company/jobs/{id}` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| POST | `/company/jobs/{id}/close` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| GET | `/company/jobs/{jobId}/applicants` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| GET | `/company/jobs/{jobId}/applicants/{applicantId}` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| POST | `/company/jobs/{jobId}/applicants/{applicantId}/right` | Yes | `auth:sanctum`, `role:hr,company_admin` |
| POST | `/company/jobs/{jobId}/applicants/{applicantId}/left` | Yes | `auth:sanctum`, `role:hr,company_admin` |

## Applicant Swipe

| Method | Endpoint | Auth | Middleware |
| --- | --- | --- | --- |
| GET | `/applicant/swipe/deck` | Yes | `auth:sanctum`, `role:applicant` |
| GET | `/applicant/swipe/limits` | Yes | `auth:sanctum`, `role:applicant` |
| POST | `/applicant/swipe/right/{jobId}` | Yes | `auth:sanctum`, `role:applicant`, `swipe.limit` |
| POST | `/applicant/swipe/left/{jobId}` | Yes | `auth:sanctum`, `role:applicant`, `swipe.limit` |

## Notifications

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/notifications` | Yes |
| GET | `/notifications/unread` | Yes |
| PATCH | `/notifications/{id}/read` | Yes |
| PATCH | `/notifications/read-all` | Yes |
| GET | `/notifications/preferences` | Yes |
| PATCH | `/notifications/preferences` | Yes |

## Misc

| Method | Endpoint | Auth |
| --- | --- | --- |
| GET | `/health` | No |
| GET | `/debug/database` | No |

## Common Errors

| Code | Status |
| --- | --- |
| `VALIDATION_ERROR` | 400 |
| `UNAUTHENTICATED` | 401 |
| `UNAUTHORIZED` | 403 |
| `SUBSCRIPTION_REQUIRED` | 402 |
| `NOT_FOUND` | 404 |
| `MAX_IMAGES_EXCEEDED` | 409 |
| `INVALID_FILE_TYPE` | 400 |
| `FILE_TOO_LARGE` | 400 |
| `INVALID_URL` | 400 |
| `WEBHOOK_VERIFICATION_FAILED` | 400 |
