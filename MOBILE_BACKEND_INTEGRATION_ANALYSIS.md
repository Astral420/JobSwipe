# Mobile Frontend ↔ Backend Integration Analysis

**Date**: April 28, 2026  
**Analyzed by**: Kiro AI  
**Scope**: React Native Mobile App (Expo) + Laravel Backend API

---

## Executive Summary

The mobile frontend is **90% UI-complete** but has **minimal backend integration**. Most screens use mock/hardcoded data. Only authentication endpoints are partially integrated. This document identifies what's ready, what's missing, and provides an implementation plan.

---

## 1. What's Ready to Use (Backend → Frontend)

### ✅ Authentication Endpoints (Partially Integrated)

| Endpoint | Status | Mobile Implementation |
|----------|--------|----------------------|
| `POST /api/v1/auth/register` | ✅ Integrated | `app/(auth)/register.tsx` |
| `POST /api/v1/auth/login` | ✅ Integrated | `app/(auth)/login.tsx` |
| `POST /api/v1/auth/logout` | ⚠️ Backend ready, not used | Not implemented |
| `GET /api/v1/auth/me` | ⚠️ Backend ready, not used | Not implemented |
| `POST /api/v1/auth/verify-email` | ❌ Not integrated | Not implemented |
| `POST /api/v1/auth/resend-verification` | ❌ Not integrated | Not implemented |

**Notes**:
- Login/Register use hardcoded `localhost:8000` URLs
- Mock mode is enabled by default (`MOCK_AUTH = true`)
- No environment variable configuration for API URL
- Token storage works via AsyncStorage (Zustand)

---

## 2. Missing/Incomplete Endpoints (Backend Exists, Frontend Doesn't Use)

### 🔴 Critical Missing Integrations

#### A. **Swipe/Job Discovery** (`app/(tabs)/index.tsx`)
**Current State**: Uses hardcoded `JOBS` array with 15 mock jobs  
**Backend Endpoints Available**:
```
GET /api/v1/applicant/swipe/deck       → Get swipeable jobs
GET /api/v1/applicant/swipe/limits     → Get daily swipe limits
POST /api/v1/applicant/swipe/right/:id → Swipe right (like)
POST /api/v1/applicant/swipe/left/:id  → Swipe left (pass)
```

**What's Missing**:
- No API service layer
- No data fetching on mount
- No swipe action handlers connected to backend
- No swipe limit tracking from backend
- Distance filtering is client-side only

---

#### B. **Job Browsing** (`app/(tabs)/jobs.tsx`)
**Current State**: Uses hardcoded `JOBS` array with 6 mock jobs  
**Backend Endpoints Available**:
```
GET /api/v1/company/jobs → List all jobs (for companies)
```

**What's Missing**:
- No endpoint for applicants to browse all jobs
- No search/filter API integration
- No pagination
- Carousel auto-scroll uses mock data

**Backend Gap**: Need `GET /api/v1/applicant/jobs/browse` endpoint

---

#### C. **Matches & Messaging** (`app/(tabs)/matches.tsx`)
**Current State**: Uses hardcoded `PIPELINE` and `SEED_MESSAGES` arrays  
**Backend Endpoints Available**:
```
GET /api/v1/applicant/matches              → List matches
GET /api/v1/applicant/matches/:id          → Get match details
POST /api/v1/applicant/matches/:id/accept  → Accept match
POST /api/v1/applicant/matches/:id/decline → Decline match
GET /api/v1/matches/:matchId/messages      → Get messages
POST /api/v1/matches/:matchId/messages     → Send message
POST /api/v1/matches/:matchId/messages/typing → Typing indicator
PATCH /api/v1/matches/:matchId/messages/read  → Mark as read
```

**What's Missing**:
- No API calls to fetch matches
- No real-time messaging (WebSocket/Reverb not integrated)
- Auto-replies are client-side mocks
- No message persistence
- No unread count from backend

---

#### D. **Applications** (`app/(tabs)/profile.tsx` or dedicated screen)
**Current State**: No applications screen exists  
**Backend Endpoints Available**:
```
GET /api/v1/applicant/applications     → List applications
GET /api/v1/applicant/applications/:id → Get application details
```

**What's Missing**:
- Entire applications screen/tab
- Application status tracking UI
- Application history

---

#### E. **Profile Management**
**Current State**: Profile screen exists but no API integration  
**Backend Endpoints Available**:
```
GET /api/v1/profile/applicant                    → Get profile
PATCH /api/v1/profile/applicant/basic-info       → Update basic info
PATCH /api/v1/profile/applicant/skills           → Update skills
POST /api/v1/profile/applicant/experience        → Add experience
PATCH /api/v1/profile/applicant/experience/:idx  → Update experience
DELETE /api/v1/profile/applicant/experience/:idx → Remove experience
POST /api/v1/profile/applicant/education         → Add education
PATCH /api/v1/profile/applicant/education/:idx   → Update education
DELETE /api/v1/profile/applicant/education/:idx  → Remove education
PATCH /api/v1/profile/applicant/resume           → Update resume
PATCH /api/v1/profile/applicant/photo            → Update photo
PATCH /api/v1/profile/applicant/social-links     → Update social links
```

**What's Missing**:
- No profile fetch on mount
- No profile edit forms
- No file upload integration
- No profile completion tracking

---

#### F. **Notifications**
**Current State**: No notifications screen  
**Backend Endpoints Available**:
```
GET /api/v1/notifications                  → List notifications
GET /api/v1/notifications/unread           → Get unread count
PATCH /api/v1/notifications/:id/read       → Mark as read
PATCH /api/v1/notifications/read-all       → Mark all as read
GET /api/v1/notifications/preferences      → Get preferences
PATCH /api/v1/notifications/preferences    → Update preferences
```

**What's Missing**:
- Entire notifications screen
- Push notification setup (Expo Notifications)
- Notification badge on tab bar

---

#### G. **Subscriptions & IAP** (`app/subscription.tsx`)
**Current State**: Subscription screen exists but no backend integration  
**Backend Endpoints Available**:
```
POST /api/v1/iap/purchase                      → Purchase subscription/swipe pack
GET /api/v1/applicant/subscription/status      → Get subscription status
GET /api/v1/applicant/purchases                → Get purchase history
POST /api/v1/applicant/subscription/cancel     → Cancel subscription
POST /api/v1/webhooks/apple-iap                → Apple webhook (backend only)
POST /api/v1/webhooks/google-play              → Google webhook (backend only)
```

**What's Missing**:
- No IAP SDK integration (expo-in-app-purchases or react-native-iap)
- No product listing from backend
- No purchase flow
- No subscription status display
- No receipt validation

---

#### H. **Company/HR Screens** (`app/(company-tabs)/`)
**Current State**: Basic UI exists, no backend integration  
**Backend Endpoints Available**:
```
GET /api/v1/company/jobs                           → List jobs
POST /api/v1/company/jobs                          → Create job
GET /api/v1/company/jobs/:id                       → Get job details
PUT /api/v1/company/jobs/:id                       → Update job
DELETE /api/v1/company/jobs/:id                    → Delete job
POST /api/v1/company/jobs/:id/close                → Close job
POST /api/v1/company/jobs/:id/restore              → Restore job
GET /api/v1/company/jobs/:jobId/applicants         → List applicants
GET /api/v1/company/jobs/:jobId/applicants/:id     → Get applicant details
POST /api/v1/company/jobs/:jobId/applicants/:id/right → Swipe right
POST /api/v1/company/jobs/:jobId/applicants/:id/left  → Swipe left
GET /api/v1/company/matches                        → List matches
GET /api/v1/company/matches/:id                    → Get match details
POST /api/v1/company/matches/:id/close             → Close match
```

**What's Missing**:
- No job creation form connected to backend
- No applicant review flow
- No company matches integration
- No company profile management

---

#### I. **Reviews** (No screen exists)
**Backend Endpoints Available**:
```
POST /api/v1/reviews                    → Create review
GET /api/v1/reviews/company/:companyId  → Get company reviews
POST /api/v1/reviews/:id/flag           → Flag review
```

**What's Missing**:
- Entire review submission flow
- Company review display
- Review moderation UI

---

#### J. **File Uploads**
**Backend Endpoints Available**:
```
POST /api/v1/files/upload-url      → Generate S3 upload URL
POST /api/v1/files/read-url        → Generate S3 read URL
POST /api/v1/files/confirm-upload  → Confirm upload completion
```

**What's Missing**:
- No file upload service layer
- No S3 integration
- No image picker → upload flow
- No resume/document upload flow

---

## 3. Backend Gaps (Frontend Needs, Backend Missing)

### 🟡 Endpoints That Should Be Created

| Missing Endpoint | Purpose | Priority |
|------------------|---------|----------|
| `GET /api/v1/applicant/jobs/browse` | Browse all jobs (not just swipe deck) | High |
| `GET /api/v1/applicant/jobs/:id` | Get job details for detail view | High |
| `GET /api/v1/applicant/profile/completion` | Get profile completion % | Medium |
| `GET /api/v1/applicant/swipe/history` | Get swipe history | Low |
| `GET /api/v1/company/analytics/dashboard` | Company dashboard stats | Medium |

**Note**: Some of these may already exist but aren't documented in `routes/api.php`

---

## 4. Implementation Plan

### Phase 1: Foundation (Week 1)

**Goal**: Set up API service layer and environment configuration

#### Tasks:
1. **Create API service layer**
   ```typescript
   // services/api.ts
   import axios from 'axios';
   import { useAuthStore } from '../store/authStore';
   
   const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
   
   export const api = axios.create({
     baseURL: API_BASE_URL,
     headers: { 'Content-Type': 'application/json' },
   });
   
   api.interceptors.request.use((config) => {
     const token = useAuthStore.getState().token;
     if (token) config.headers.Authorization = `Bearer ${token}`;
     return config;
   });
   ```

2. **Add environment variables**
   ```bash
   # .env
   EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
   EXPO_PUBLIC_WS_URL=ws://localhost:6001
   ```

3. **Create typed API client**
   ```typescript
   // services/apiClient.ts
   export const authApi = {
     login: (email: string, password: string) => api.post('/auth/login', { email, password }),
     register: (data: RegisterData) => api.post('/auth/register', data),
     logout: () => api.post('/auth/logout'),
     me: () => api.get('/auth/me'),
   };
   
   export const swipeApi = {
     getDeck: () => api.get('/applicant/swipe/deck'),
     getLimits: () => api.get('/applicant/swipe/limits'),
     swipeRight: (jobId: number) => api.post(`/applicant/swipe/right/${jobId}`),
     swipeLeft: (jobId: number) => api.post(`/applicant/swipe/left/${jobId}`),
   };
   
   // ... more API modules
   ```

4. **Add TypeScript types**
   ```typescript
   // types/api.ts
   export interface Job {
     id: number;
     company: string;
     position: string;
     salary: string;
     location: string;
     tags: { label: string; variant: string }[];
     description: string;
     matchPercent: number;
     photos: string[];
     distanceKm: number;
   }
   
   export interface Match {
     id: number;
     company: string;
     role: string;
     status: 'applied' | 'screening' | 'interview' | 'offer';
     lastMsg: string;
     time: string;
     unread: number;
   }
   
   // ... more types
   ```

---

### Phase 2: Core Features (Week 2-3)

**Goal**: Integrate swipe, matches, and messaging

#### 2.1 Swipe Integration
**File**: `app/(tabs)/index.tsx`

```typescript
import { useEffect, useState } from 'react';
import { swipeApi } from '../../services/apiClient';

export default function HomeTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [swipeLimits, setSwipeLimits] = useState({ used: 0, max: 15 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeck();
    loadLimits();
  }, []);

  const loadDeck = async () => {
    try {
      const { data } = await swipeApi.getDeck();
      setJobs(data.data.jobs);
    } catch (error) {
      console.error('Failed to load deck:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLimits = async () => {
    try {
      const { data } = await swipeApi.getLimits();
      setSwipeLimits({ used: data.data.swipes_used, max: data.data.daily_limit });
    } catch (error) {
      console.error('Failed to load limits:', error);
    }
  };

  const handleSwipeRight = async (jobId: number) => {
    try {
      await swipeApi.swipeRight(jobId);
      setSwipeLimits(prev => ({ ...prev, used: prev.used + 1 }));
      // Show match modal if response indicates match
    } catch (error) {
      console.error('Swipe failed:', error);
    }
  };

  const handleSwipeLeft = async (jobId: number) => {
    try {
      await swipeApi.swipeLeft(jobId);
      setSwipeLimits(prev => ({ ...prev, used: prev.used + 1 }));
    } catch (error) {
      console.error('Swipe failed:', error);
    }
  };

  // ... rest of component
}
```

#### 2.2 Matches Integration
**File**: `app/(tabs)/matches.tsx`

```typescript
import { matchApi, messageApi } from '../../services/apiClient';

export default function MatchesTab() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const { data } = await matchApi.list();
      setMatches(data.data.matches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  };

  const loadMessages = async (matchId: number) => {
    try {
      const { data } = await messageApi.list(matchId);
      setMessages(data.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async (matchId: number, text: string) => {
    try {
      const { data } = await messageApi.send(matchId, text);
      setMessages(prev => [...prev, data.data.message]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // ... rest of component
}
```

#### 2.3 Real-time Messaging (Optional)
**File**: `services/websocket.ts`

```typescript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js/react-native';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:6001';

export const echo = new Echo({
  broadcaster: 'reverb',
  key: process.env.EXPO_PUBLIC_REVERB_APP_KEY,
  wsHost: WS_URL,
  wsPort: 6001,
  forceTLS: false,
  enabledTransports: ['ws', 'wss'],
});

export const subscribeToMatch = (matchId: number, onMessage: (message: any) => void) => {
  return echo.private(`match.${matchId}`)
    .listen('MessageSent', (e: any) => {
      onMessage(e.message);
    });
};
```

---

### Phase 3: Profile & Applications (Week 4)

#### 3.1 Profile Management
**File**: `app/(tabs)/profile.tsx`

```typescript
import { profileApi } from '../../services/apiClient';

export default function ProfileTab() {
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await profileApi.get();
      setProfile(data.data.profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const updateBasicInfo = async (updates: Partial<ApplicantProfile>) => {
    try {
      await profileApi.updateBasicInfo(updates);
      setProfile(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  // ... rest of component
}
```

#### 3.2 Applications Screen
**File**: `app/(tabs)/applications.tsx` (NEW)

```typescript
import { applicationApi } from '../../services/apiClient';

export default function ApplicationsTab() {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const { data } = await applicationApi.list();
      setApplications(data.data.applications);
    } catch (error) {
      console.error('Failed to load applications:', error);
    }
  };

  // ... rest of component
}
```

---

### Phase 4: Advanced Features (Week 5-6)

#### 4.1 File Uploads
**File**: `services/fileUpload.ts`

```typescript
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { fileApi } from './apiClient';

export const uploadResume = async () => {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
  if (result.canceled) return null;

  const file = result.assets[0];
  
  // Get upload URL from backend
  const { data } = await fileApi.getUploadUrl({
    file_name: file.name,
    file_type: file.mimeType,
    file_size: file.size,
  });

  // Upload to S3
  const uploadResponse = await fetch(data.data.upload_url, {
    method: 'PUT',
    body: await fetch(file.uri).then(r => r.blob()),
    headers: { 'Content-Type': file.mimeType },
  });

  if (!uploadResponse.ok) throw new Error('Upload failed');

  // Confirm upload
  await fileApi.confirmUpload({ file_key: data.data.file_key });

  return data.data.file_key;
};

export const uploadPhoto = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return null;

  const file = result.assets[0];
  
  // Similar upload flow as resume
  // ...
};
```

#### 4.2 Notifications
**File**: `services/notifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import { notificationApi } from './apiClient';

export const registerForPushNotifications = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Send token to backend
  await notificationApi.registerDevice({ push_token: token });

  return token;
};
```

#### 4.3 IAP Integration
**File**: `services/iap.ts`

```typescript
import * as InAppPurchases from 'expo-in-app-purchases';
import { iapApi } from './apiClient';

export const initializeIAP = async () => {
  await InAppPurchases.connectAsync();
};

export const purchaseSubscription = async (productId: string) => {
  try {
    await InAppPurchases.purchaseItemAsync(productId);
    
    // Get receipt
    const history = await InAppPurchases.getPurchaseHistoryAsync();
    const purchase = history.results.find(p => p.productId === productId);
    
    if (!purchase) throw new Error('Purchase not found');

    // Send receipt to backend for validation
    const { data } = await iapApi.purchase({
      receipt: purchase.transactionReceipt,
      product_id: productId,
      platform: Platform.OS,
    });

    return data.data;
  } catch (error) {
    console.error('Purchase failed:', error);
    throw error;
  }
};
```

---

### Phase 5: Company/HR Features (Week 7-8)

#### 5.1 Job Creation
**File**: `app/(company-tabs)/CreateJobScreen.tsx`

```typescript
import { jobApi } from '../../services/apiClient';

export default function CreateJobScreen() {
  const [formData, setFormData] = useState<CreateJobData>({
    title: '',
    description: '',
    salary_min: '',
    salary_max: '',
    location: '',
    // ... more fields
  });

  const handleSubmit = async () => {
    try {
      const { data } = await jobApi.create(formData);
      router.back();
      // Show success message
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  // ... rest of component
}
```

#### 5.2 Applicant Review
**File**: `app/(company-tabs)/applicants.tsx`

```typescript
import { applicantApi } from '../../services/apiClient';

export default function ApplicantsScreen() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const { jobId } = useLocalSearchParams();

  useEffect(() => {
    loadApplicants();
  }, [jobId]);

  const loadApplicants = async () => {
    try {
      const { data } = await applicantApi.list(jobId);
      setApplicants(data.data.applicants);
    } catch (error) {
      console.error('Failed to load applicants:', error);
    }
  };

  const handleSwipeRight = async (applicantId: number) => {
    try {
      await applicantApi.swipeRight(jobId, applicantId);
      // Show match modal if response indicates match
    } catch (error) {
      console.error('Swipe failed:', error);
    }
  };

  // ... rest of component
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests
```typescript
// __tests__/services/api.test.ts
import { swipeApi } from '../../services/apiClient';
import MockAdapter from 'axios-mock-adapter';

describe('swipeApi', () => {
  it('should fetch swipe deck', async () => {
    const mock = new MockAdapter(api);
    mock.onGet('/applicant/swipe/deck').reply(200, {
      success: true,
      data: { jobs: [] },
    });

    const response = await swipeApi.getDeck();
    expect(response.data.success).toBe(true);
  });
});
```

### 5.2 Integration Tests
```typescript
// __tests__/screens/HomeTab.test.tsx
import { render, waitFor } from '@testing-library/react-native';
import HomeTab from '../../app/(tabs)/index';

jest.mock('../../services/apiClient');

describe('HomeTab', () => {
  it('should load jobs on mount', async () => {
    const { getByText } = render(<HomeTab />);
    
    await waitFor(() => {
      expect(getByText('TechFlow Inc')).toBeTruthy();
    });
  });
});
```

---

## 6. Migration Checklist

### Pre-Migration
- [ ] Set up API service layer
- [ ] Add environment variables
- [ ] Create TypeScript types
- [ ] Set up error handling
- [ ] Add loading states

### Phase 1: Auth
- [ ] Remove mock mode from login
- [ ] Integrate logout endpoint
- [ ] Add email verification flow
- [ ] Add password reset flow

### Phase 2: Core
- [ ] Integrate swipe deck
- [ ] Integrate swipe actions
- [ ] Integrate matches list
- [ ] Integrate messaging
- [ ] Add real-time messaging (optional)

### Phase 3: Profile
- [ ] Integrate profile fetch
- [ ] Integrate profile updates
- [ ] Add file upload for resume
- [ ] Add file upload for photo
- [ ] Add applications screen

### Phase 4: Advanced
- [ ] Add notifications screen
- [ ] Integrate push notifications
- [ ] Integrate IAP
- [ ] Add subscription management

### Phase 5: Company
- [ ] Integrate job creation
- [ ] Integrate job management
- [ ] Integrate applicant review
- [ ] Integrate company matches

---

## 7. Recommended Architecture

```
frontend/mobile/
├── app/                    # Expo Router screens
├── components/             # Reusable UI components
├── services/               # NEW: API integration layer
│   ├── api.ts             # Axios instance
│   ├── apiClient.ts       # Typed API methods
│   ├── fileUpload.ts      # File upload helpers
│   ├── notifications.ts   # Push notification setup
│   ├── iap.ts             # In-app purchase logic
│   └── websocket.ts       # Real-time messaging
├── types/                  # NEW: TypeScript types
│   ├── api.ts             # API response types
│   ├── models.ts          # Domain models
│   └── index.ts           # Type exports
├── hooks/                  # NEW: Custom hooks
│   ├── useApi.ts          # API call hook with loading/error
│   ├── useAuth.ts         # Auth helpers
│   └── useWebSocket.ts    # WebSocket hook
├── store/                  # Zustand stores
│   ├── authStore.ts       # Existing
│   ├── jobStore.ts        # NEW: Job state
│   ├── matchStore.ts      # NEW: Match state
│   └── profileStore.ts    # NEW: Profile state
└── utils/                  # NEW: Utility functions
    ├── formatters.ts      # Date, currency formatters
    ├── validators.ts      # Form validation
    └── constants.ts       # App constants
```

---

## 8. Priority Matrix

| Feature | Priority | Effort | Impact | Order |
|---------|----------|--------|--------|-------|
| API Service Layer | 🔴 Critical | Medium | High | 1 |
| Swipe Integration | 🔴 Critical | Medium | High | 2 |
| Matches Integration | 🔴 Critical | Medium | High | 3 |
| Messaging Integration | 🟡 High | High | High | 4 |
| Profile Management | 🟡 High | Medium | Medium | 5 |
| Applications Screen | 🟡 High | Low | Medium | 6 |
| File Uploads | 🟢 Medium | High | Medium | 7 |
| Notifications | 🟢 Medium | Medium | Medium | 8 |
| IAP Integration | 🟢 Medium | High | High | 9 |
| Company Features | 🟢 Medium | High | Medium | 10 |
| Real-time Messaging | 🔵 Low | High | Low | 11 |

---

## 9. Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Foundation | 1 week | API service layer, types, environment setup |
| Phase 2: Core Features | 2 weeks | Swipe, matches, messaging integration |
| Phase 3: Profile & Apps | 1 week | Profile management, applications screen |
| Phase 4: Advanced | 2 weeks | File uploads, notifications, IAP |
| Phase 5: Company | 2 weeks | Job creation, applicant review, company matches |
| **Total** | **8 weeks** | Fully integrated mobile app |

---

## 10. Next Steps

1. **Review this document** with the team
2. **Prioritize features** based on business needs
3. **Set up development environment** (API URL, test accounts)
4. **Create a spec** for the integration work (use Kiro's spec workflow)
5. **Start with Phase 1** (API service layer)

---

## Appendix: Backend Endpoint Reference

See `JobSwipe/backend/routes/api.php` for the complete list of available endpoints.

**Key Endpoint Groups**:
- `/api/v1/auth/*` - Authentication
- `/api/v1/applicant/*` - Applicant features
- `/api/v1/company/*` - Company/HR features
- `/api/v1/profile/*` - Profile management
- `/api/v1/matches/*` - Match messaging
- `/api/v1/notifications/*` - Notifications
- `/api/v1/iap/*` - In-app purchases
- `/api/v1/files/*` - File uploads

---

**End of Analysis**
