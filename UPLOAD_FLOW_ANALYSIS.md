# Upload Flow Analysis - What Happens When Uploads Fail

## Your Questions Answered

### Question 1: Does onboarding complete if uploads fail?
**Answer: NO - Onboarding is BLOCKED if uploads fail after all retries.**

### Question 2: If uploads succeed later, does it update MongoDB?
**Answer: YES - But only if you retry the onboarding step manually.**

---

## Detailed Flow Analysis

### Current Flow: Company Registration

```
User completes OTP verification
    ↓
handleVerifyOtp() called
    ↓
setToken(token, 'company_admin')
    ↓
setOnboarding(true)
    ↓
completeCompanyOnboarding() called
    ↓
┌─────────────────────────────────────┐
│ Step 1: Company Details             │
│ - No uploads, just text data        │
│ - Saves to MongoDB immediately      │
│ - ✅ Always succeeds                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Step 2: Verification Documents      │
│ - Upload each doc with retry logic  │
│ - If ANY upload fails after 3       │
│   retries, throw error              │
│ - ❌ BLOCKS onboarding              │
└─────────────────────────────────────┘
    ↓
    If error thrown here:
    ↓
    catch (err) {
      setError(err.message);
      setErrorTimestamp(Date.now());
    }
    ↓
    User stays on OTP screen
    ↓
    Sees error: "Failed to upload verification documents: doc1.pdf, doc2.pdf"
    ↓
    ❌ CANNOT proceed to app
    ↓
    Must retry OTP verification (which retries uploads)
```

### What Happens When Upload Fails

**Scenario: Verification doc upload fails after 3 retries**

```typescript
// In completeCompanyOnboarding()
if (currentStep <= 2) {
  const verificationDocumentUrls: string[] = [];
  const failedDocs: string[] = [];
  
  for (let i = 0; i < totalDocs; i++) {
    try {
      const url = await uploadSingleFile(file, 'document');
      verificationDocumentUrls.push(url);
    } catch (err) {
      failedDocs.push(file.name); // ← Track failed file
    }
  }
  
  if (failedDocs.length > 0) {
    throw new Error(`Failed to upload: ${failedDocs.join(', ')}`); // ← BLOCKS onboarding
  }
  
  // This line is NEVER reached if uploads failed
  await api.post('/profile/onboarding/complete-step', {
    step: 2,
    step_data: { verification_documents: verificationDocumentUrls },
  });
}
```

**Result:**
- ❌ Step 2 is NOT saved to MongoDB
- ❌ `onboarding_step` stays at 2 (not incremented)
- ❌ User cannot proceed to app
- ❌ Error is shown on OTP screen

---

## Backend Behavior

### When `/profile/onboarding/complete-step` is Called

```php
// ProfileOnboardingService.php
public function completeOnboardingStep(string $userId, string $role, int $step, array $data = []): array
{
    $profile = $this->ensureCompanyDocument($userId, $companyProfile);
    $currentStep = $profile->onboarding_step ?? 1;
    
    // Check if step matches current step
    if ((int) $currentStep !== $step) {
        throw new InvalidArgumentException('INVALID_ONBOARDING_STEP');
    }
    
    // Apply the step (saves data to MongoDB)
    $this->applyCompanyOnboardingStep($userId, $step, $data);
    
    // Increment onboarding_step
    if ($step >= self::COMPANY_ONBOARDING_STEPS) {
        $this->markOnboardingComplete($profile); // ← Sets onboarding_step = 'completed'
    } else {
        $this->companyDocs->update($profile, ['onboarding_step' => $step + 1]); // ← Increments step
    }
    
    return $this->getOnboardingStatus($userId, $role);
}
```

**Key Points:**
1. **Step data is saved to MongoDB** when `/profile/onboarding/complete-step` is called
2. **`onboarding_step` is incremented** after successful save
3. **If frontend never calls this endpoint** (because upload failed), MongoDB is NOT updated

---

## What Gets Saved to MongoDB

### Step 1: Company Details (Always Succeeds)
```json
{
  "user_id": "123",
  "company_id": "456",
  "company_name": "Acme Corp",
  "description": "We make widgets",
  "industry": "Technology",
  "company_size": "11-50",
  "onboarding_step": 2  // ← Incremented to 2
}
```

### Step 2: Verification Documents (Can Fail)
**If uploads succeed:**
```json
{
  "verification_documents": [
    "https://r2.example.com/documents/doc1.pdf",
    "https://r2.example.com/documents/doc2.pdf"
  ],
  "onboarding_step": 3  // ← Incremented to 3
}
```

**If uploads fail:**
```json
{
  // verification_documents NOT added
  "onboarding_step": 2  // ← Stays at 2 (NOT incremented)
}
```

### Step 3: Logo & Office Images (Can Fail)
**If uploads succeed:**
```json
{
  "logo_url": "https://r2.example.com/images/logo.png",
  "office_images": [
    "https://r2.example.com/images/office1.jpg",
    "https://r2.example.com/images/office2.jpg"
  ],
  "onboarding_step": "completed"  // ← Marked as completed
}
```

**If uploads fail:**
```json
{
  // logo_url and office_images NOT added
  "onboarding_step": 3  // ← Stays at 3 (NOT marked as completed)
}
```

---

## User Experience

### Scenario 1: All Uploads Succeed ✅
```
User enters OTP
    ↓
Uploads: doc1.pdf ✅, doc2.pdf ✅
    ↓
Uploads: logo.png ✅, office1.jpg ✅, office2.jpg ✅
    ↓
MongoDB updated with all data
    ↓
onboarding_step = 'completed'
    ↓
Navigate to /(company-tabs)
    ↓
User sees home screen ✅
```

### Scenario 2: Verification Doc Upload Fails ❌
```
User enters OTP
    ↓
Uploads: doc1.pdf ✅, doc2.pdf ❌ (network error after 3 retries)
    ↓
Error thrown: "Failed to upload verification documents: doc2.pdf"
    ↓
MongoDB NOT updated (still at step 2)
    ↓
User stays on OTP screen
    ↓
Error message shown: "Failed to upload verification documents: doc2.pdf"
    ↓
User must retry OTP verification
    ↓
On retry, uploads start from scratch
```

### Scenario 3: Logo Upload Fails ❌
```
User enters OTP
    ↓
Uploads: doc1.pdf ✅, doc2.pdf ✅
    ↓
Step 2 saved to MongoDB ✅
    ↓
Uploads: logo.png ❌ (network error after 3 retries)
    ↓
Error thrown: "Failed to upload company logo. Please try again."
    ↓
MongoDB NOT updated (still at step 3)
    ↓
User stays on OTP screen
    ↓
Error message shown
    ↓
User must retry OTP verification
    ↓
On retry, uploads start from scratch (including docs again)
```

---

## Problem: Redundant Re-uploads

### Current Issue
If logo upload fails, user must retry OTP verification, which:
1. ❌ Re-uploads verification docs (already succeeded)
2. ❌ Re-uploads logo (failed before)
3. ❌ Wastes time and bandwidth

### Why This Happens
```typescript
// In completeCompanyOnboarding()
const currentStep = rawStep === 'completed'
  ? 4
  : typeof rawStep === 'number'
    ? rawStep
    : Number.parseInt(String(rawStep ?? '1'), 10) || 1;

if (currentStep <= 1) {
  // Step 1: Company details
}

if (currentStep <= 2) {
  // Step 2: Verification docs ← Re-uploads even if already done
}

if (currentStep <= 3) {
  // Step 3: Logo & office images
}
```

**The `<=` check means:**
- If `currentStep = 2`, it re-uploads verification docs
- If `currentStep = 3`, it re-uploads verification docs AND logo

---

## Proposed Solution: Skip Completed Steps

### Option A: Check MongoDB Before Re-uploading
```typescript
const completeCompanyOnboarding = async () => {
  const onboardingStatus = await api.get('/profile/onboarding/status');
  const currentStep = onboardingStatus?.onboarding_step;
  
  // Only upload if step not completed
  if (currentStep <= 2 && !onboardingStatus.verification_documents_uploaded) {
    // Upload verification docs
  }
  
  if (currentStep <= 3 && !onboardingStatus.media_uploaded) {
    // Upload logo & office images
  }
};
```

**Pros:**
- Doesn't re-upload already successful files
- Faster retry

**Cons:**
- Requires backend changes (add flags to track what's uploaded)

### Option B: Store Upload URLs Locally
```typescript
const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
const [uploadedLogo, setUploadedLogo] = useState<string | null>(null);

// On successful upload, store URL
const url = await uploadSingleFile(file, 'document');
setUploadedDocs(prev => [...prev, url]);

// On retry, use stored URLs instead of re-uploading
if (uploadedDocs.length > 0) {
  verificationDocumentUrls = uploadedDocs;
} else {
  // Upload fresh
}
```

**Pros:**
- No backend changes
- Doesn't re-upload successful files

**Cons:**
- State management complexity
- URLs lost if user closes app

### Option C: Accept Re-uploads (Current Behavior)
**Pros:**
- Simple
- Ensures all files are uploaded

**Cons:**
- Wastes time and bandwidth
- Poor UX on slow connections

---

## Recommendation

### Short-term (Current Implementation)
**Accept re-uploads** - It's simple and works. The retry logic makes uploads more reliable, so re-uploads should be rare.

### Medium-term (If re-uploads become a problem)
**Implement Option B** - Store successful upload URLs in state, skip re-uploading them on retry.

### Long-term (If uploads are still problematic)
**Implement chunked uploads** - Split large files into chunks, resume from last successful chunk.

---

## Summary

### Question 1: Does onboarding complete if uploads fail?
**NO.** If any upload fails after 3 retries:
- Error is thrown
- User stays on OTP screen
- MongoDB is NOT updated
- User must retry OTP verification

### Question 2: If uploads succeed later, does it update MongoDB?
**YES, but only on retry.** When user retries OTP verification:
- `completeCompanyOnboarding()` runs again
- Uploads are attempted again (including previously successful ones)
- If all uploads succeed, MongoDB is updated
- `onboarding_step` is set to 'completed'

### Key Takeaway
**Uploads are blocking.** User cannot proceed to the app until ALL uploads succeed. The retry logic (3 attempts with exponential backoff) makes this more reliable, but if network is consistently poor, user will be stuck.
