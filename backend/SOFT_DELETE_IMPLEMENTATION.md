# Soft Delete Implementation for Job Postings

## Overview
Implemented soft delete functionality for job postings with audit trail, restore capability, and admin-only hard delete option.

## Changes Made

### 1. Database Migration
**File:** `database/migrations/2026_04_15_000001_add_soft_deletes_to_job_postings.php`

Added columns:
- `deleted_at` (timestamp, nullable) - Soft delete timestamp
- `deleted_by` (uuid, nullable) - User who deleted the job
- `deletion_reason` (text, nullable) - Optional reason for deletion
- Foreign key constraint on `deleted_by` → `users.id`
- Index on `deleted_at` for query performance

### 2. Model Updates
**File:** `app/Models/PostgreSQL/JobPosting.php`

- Added `SoftDeletes` trait
- Added `deleted_by` and `deletion_reason` to `$fillable`
- Added `deleted_at` to `$casts`
- Added `deletedBy()` relationship
- Updated `active()` scope to explicitly exclude soft-deleted jobs
- Added `withDeleted()` scope for admin views

### 3. Controller Endpoints
**File:** `app/Http/Controllers/Company/JobPostingController.php`

#### Updated Endpoints:

**DELETE /api/v1/company/jobs/{id}** (Soft Delete)
- Soft deletes the job posting
- Records `deleted_by` (authenticated user)
- Records optional `deletion_reason` from request
- Only works on non-active jobs (must close first)
- Maintains referential integrity for applications/matches

**POST /api/v1/company/jobs/{id}/restore** (Restore)
- Restores a soft-deleted job posting
- Only the owning company can restore
- Clears audit fields (`deleted_by`, `deletion_reason`)
- Returns job to previous status (closed/expired)

**DELETE /api/v1/admin/jobs/{id}/force** (Hard Delete - Admin Only)
- Permanently deletes a job posting
- Requires `super_admin` or `moderator` role
- Removes from search index
- Irreversible operation
- Use only for compliance/legal reasons

### 4. Routes
**File:** `routes/api.php`

```php
// Company routes (hr, company_admin)
Route::post('jobs/{id}/restore', [JobPostingController::class, 'restore']);

// Admin routes (moderator, super_admin)
Route::delete('admin/jobs/{id}/force', [JobPostingController::class, 'forceDestroy']);
```

## Benefits

### Data Integrity
- Applications and matches still reference valid job IDs
- Historical data remains intact for analytics
- No broken foreign key references

### Audit Trail
- Track who deleted what and when
- Optional reason field for documentation
- Compliance with data retention requirements

### Recoverability
- Accidentally deleted jobs can be restored
- No data loss from user errors
- Maintains business continuity

### Query Behavior
```php
// Default: excludes soft-deleted
JobPosting::active()->get();

// Include soft-deleted
JobPosting::withTrashed()->find($id);

// Only soft-deleted
JobPosting::onlyTrashed()->get();

// Restore
$job->restore();

// Force delete (permanent)
$job->forceDelete();
```

## API Usage Examples

### Soft Delete a Job
```bash
DELETE /api/v1/company/jobs/{id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Position filled internally"
}
```

### Restore a Deleted Job
```bash
POST /api/v1/company/jobs/{id}/restore
Authorization: Bearer {token}
```

### Force Delete (Admin Only)
```bash
DELETE /api/v1/admin/jobs/{id}/force
Authorization: Bearer {admin_token}
```

## Migration Instructions

1. Run the migration:
```bash
php artisan migrate
```

2. Existing jobs are unaffected (no data migration needed)

3. All future deletes will be soft deletes by default

4. To clean up old soft-deleted jobs (optional):
```php
// Delete jobs soft-deleted more than 1 year ago
JobPosting::onlyTrashed()
    ->where('deleted_at', '<', now()->subYear())
    ->forceDelete();
```

## Security Considerations

- Soft-deleted jobs are automatically excluded from applicant views
- Only job owners can restore their deleted jobs
- Force delete requires admin privileges
- Audit trail cannot be tampered with (immutable once set)

## Testing Checklist

- [ ] Soft delete a closed job
- [ ] Verify job is hidden from applicant deck
- [ ] Verify applications/matches still reference the job
- [ ] Restore a soft-deleted job
- [ ] Attempt to delete an active job (should fail)
- [ ] Force delete as admin
- [ ] Attempt force delete as non-admin (should fail)
- [ ] Verify `active()` scope excludes soft-deleted jobs
