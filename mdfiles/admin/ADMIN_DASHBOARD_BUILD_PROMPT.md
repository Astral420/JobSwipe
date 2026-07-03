# Admin Dashboard Build Prompt

## Project Overview
Build a comprehensive admin dashboard for JobSwipe using Next.js 14, TypeScript, and shadcn/ui components. The dashboard will provide moderators and super admins with tools to manage users, companies, subscriptions, content moderation, and platform analytics.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Styling:** Tailwind CSS
- **State Management:** Zustand (for global state)
- **HTTP Client:** Axios
- **Auth:** next-auth with Sanctum token
- **Data Tables:** TanStack Table (React Table v8)
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod validation

### Backend API
- **Base URL:** `/api/v1/admin`
- **Auth:** Laravel Sanctum token-based authentication
- **Response Format:** `{ success: boolean, data: any, message: string }`

---

## Project Structure

```
frontend/admin/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard home
│   │   │   ├── users/
│   │   │   │   ├── page.tsx                # User list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # User detail
│   │   │   ├── companies/
│   │   │   │   ├── page.tsx                # Company list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx            # Company detail
│   │   │   │   └── verifications/
│   │   │   │       └── page.tsx            # Verification queue
│   │   │   ├── jobs/
│   │   │   │   ├── page.tsx                # Job postings list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # Job detail
│   │   │   ├── reviews/
│   │   │   │   └── page.tsx                # Flagged reviews
│   │   │   ├── subscriptions/
│   │   │   │   ├── page.tsx                # Subscription list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx            # Subscription detail
│   │   │   ├── iap/
│   │   │   │   ├── transactions/
│   │   │   │   │   └── page.tsx            # IAP transactions
│   │   │   │   └── webhooks/
│   │   │   │       └── page.tsx            # Webhook events
│   │   │   ├── matches/
│   │   │   │   └── page.tsx                # Match analytics
│   │   │   ├── trust/
│   │   │   │   ├── events/
│   │   │   │   │   └── page.tsx            # Trust events
│   │   │   │   └── companies/
│   │   │   │       └── page.tsx            # Low trust companies
│   │   │   └── settings/
│   │   │       └── page.tsx                # Admin settings
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                             # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── breadcrumbs.tsx
│   │   ├── dashboard/
│   │   │   ├── stat-card.tsx
│   │   │   ├── recent-activity.tsx
│   │   │   └── charts/
│   │   ├── users/
│   │   │   ├── user-table.tsx
│   │   │   ├── user-filters.tsx
│   │   │   └── ban-user-dialog.tsx
│   │   ├── companies/
│   │   │   ├── company-table.tsx
│   │   │   ├── verification-card.tsx
│   │   │   └── trust-score-badge.tsx
│   │   ├── reviews/
│   │   │   ├── review-card.tsx
│   │   │   └── review-moderation-dialog.tsx
│   │   └── shared/
│   │       ├── data-table.tsx              # Reusable table component
│   │       ├── status-badge.tsx
│   │       └── confirmation-dialog.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                   # Axios instance
│   │   │   ├── users.ts
│   │   │   ├── companies.ts
│   │   │   ├── subscriptions.ts
│   │   │   ├── reviews.ts
│   │   │   └── dashboard.ts
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   ├── use-users.ts
│   │   │   ├── use-companies.ts
│   │   │   └── use-toast.ts
│   │   ├── stores/
│   │   │   └── auth-store.ts               # Zustand store
│   │   ├── utils.ts                        # cn() and utilities
│   │   └── constants.ts
│   └── types/
│       ├── api.ts
│       ├── user.ts
│       ├── company.ts
│       └── subscription.ts
├── public/
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Core Features & Pages

### 1. Dashboard Home (`/`)
**Purpose:** Overview of platform statistics and recent activity

**Components:**
- Stat cards (total users, active companies, revenue, etc.)
- Line chart showing user growth over time
- Bar chart showing subscription distribution
- Recent activity feed (recent verifications, bans, etc.)
- Quick actions (pending verifications count, flagged reviews count)

**API Calls:**
- `GET /api/v1/admin/dashboard/stats`

**shadcn Components:**
- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`

---

### 2. User Management (`/users`)

#### User List Page
**Features:**
- Data table with columns: Name, Email, Role, Status, Joined Date, Actions
- Filters: Role, Banned status, Search by name/email
- Pagination
- Actions: View details, Ban/Unban

**API Calls:**
- `GET /api/v1/admin/users?role={role}&is_banned={boolean}&search={query}&per_page=20`

**shadcn Components:**
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `Input` (search)
- `Select` (role filter)
- `Button`
- `Badge` (role, status)
- `DropdownMenu` (actions)

#### User Detail Page (`/users/[id]`)
**Features:**
- User profile information
- Account status and role
- Activity history
- Ban/Unban action with confirmation dialog
- Related data (applications, matches if applicant; job postings if HR)

**API Calls:**
- `GET /api/v1/admin/users/{id}`
- `POST /api/v1/admin/users/{id}/ban`
- `POST /api/v1/admin/users/{id}/unban`

**shadcn Components:**
- `Card`
- `Tabs` (for different sections)
- `AlertDialog` (ban confirmation)
- `Badge`

---

### 3. Company Management

#### Company List Page (`/companies`)
**Features:**
- Data table with columns: Company Name, Verification Status, Trust Score, Subscription Tier, Actions
- Filters: Verification status, Trust level, Subscription tier
- Search by company name
- Pagination

**API Calls:**
- `GET /api/v1/admin/companies` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Table`
- `Select` (filters)
- `Input` (search)
- `Badge` (trust level, verification status)

#### Company Detail Page (`/companies/[id]`)
**Features:**
- Company profile information
- Trust score with history chart
- Verification documents (if pending/rejected)
- Active job postings count
- HR members list
- Actions: Suspend/Unsuspend, Adjust trust score

**API Calls:**
- `GET /api/v1/admin/companies/{id}` (NEW ENDPOINT NEEDED)
- `GET /api/v1/admin/companies/{id}/trust-events` (NEW ENDPOINT NEEDED)
- `POST /api/v1/admin/companies/{id}/suspend` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Card`
- `Tabs`
- `Dialog` (trust score adjustment)
- `Badge`

#### Verification Queue (`/companies/verifications`)
**Features:**
- List of pending verifications
- Card-based layout showing company info and documents
- Approve/Reject actions with reason input
- Filter by status (pending, approved, rejected)

**API Calls:**
- `GET /api/v1/admin/companies/verifications?status=pending`
- `GET /api/v1/admin/companies/verifications/{companyId}`
- `POST /api/v1/admin/companies/verifications/{companyId}/approve`
- `POST /api/v1/admin/companies/verifications/{companyId}/reject`

**shadcn Components:**
- `Card`
- `Button`
- `Dialog` (reject reason)
- `Textarea` (reason input)
- `Badge`

---

### 4. Job Posting Management (`/jobs`)

#### Job List Page
**Features:**
- Data table with columns: Title, Company, Status, Posted Date, Actions
- Filters: Status (active, closed, flagged), Date range
- Search by title or company
- Pagination
- Actions: View, Flag, Close, Force Delete

**API Calls:**
- `GET /api/v1/admin/jobs` (NEW ENDPOINT NEEDED)
- `POST /api/v1/admin/jobs/{id}/flag` (NEW ENDPOINT NEEDED)
- `DELETE /api/v1/admin/jobs/{id}/force`

**shadcn Components:**
- `Table`
- `Select` (filters)
- `DatePicker` (date range)
- `AlertDialog` (delete confirmation)
- `Badge` (status)

---

### 5. Review Moderation (`/reviews`)

#### Flagged Reviews Page
**Features:**
- List of flagged reviews
- Card-based layout showing review content, company, reviewer
- Actions: Unflag (false positive), Remove (hide from public)
- Pagination

**API Calls:**
- `GET /api/v1/admin/reviews/flagged`
- `POST /api/v1/admin/reviews/{id}/unflag`
- `DELETE /api/v1/admin/reviews/{id}`

**shadcn Components:**
- `Card`
- `Button`
- `AlertDialog` (remove confirmation)
- `Badge` (rating)

---

### 6. Subscription Management (`/subscriptions`)

#### Subscription List Page
**Features:**
- Data table with columns: User/Company, Type, Tier, Status, Amount, Next Billing, Actions
- Filters: Status, Subscriber type (applicant/company), Tier
- Search by user email or company name
- Pagination
- Actions: View details, Cancel

**API Calls:**
- `GET /api/v1/admin/subscriptions` (NEW ENDPOINT NEEDED)
- `POST /api/v1/admin/subscriptions/{id}/cancel` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Table`
- `Select` (filters)
- `Badge` (status, tier)
- `AlertDialog` (cancel confirmation)

#### Subscription Detail Page (`/subscriptions/[id]`)
**Features:**
- Subscription information
- Payment history
- Usage statistics
- Cancel action

**API Calls:**
- `GET /api/v1/admin/subscriptions/{id}` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Card`
- `Table` (payment history)
- `AlertDialog`

---

### 7. IAP Management

#### Transactions Page (`/iap/transactions`)
**Features:**
- Data table with columns: User, Product, Provider, Amount, Status, Date, Actions
- Filters: Provider (Apple/Google), Status, Date range
- Search by user email or transaction ID
- Pagination

**API Calls:**
- `GET /api/v1/admin/iap/transactions` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Table`
- `Select` (filters)
- `DatePicker`
- `Badge` (provider, status)

#### Webhook Events Page (`/iap/webhooks`)
**Features:**
- Data table with columns: Event ID, Provider, Type, Status, Attempts, Date, Actions
- Filters: Provider, Status (pending, completed, failed)
- Actions: View details, Retry failed events
- Pagination

**API Calls:**
- `GET /api/v1/admin/iap/webhook-events` (NEW ENDPOINT NEEDED)
- `POST /api/v1/admin/iap/webhook-events/{id}/retry` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Table`
- `Select` (filters)
- `Button` (retry)
- `Badge` (status)

---

### 8. Trust System (`/trust`)

#### Trust Events Page (`/trust/events`)
**Features:**
- Data table with columns: Company, Event Type, Score Delta, Score After, Date
- Filters: Event type, Date range
- Search by company name
- Pagination

**API Calls:**
- `GET /api/v1/admin/trust/events` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Table`
- `Select` (filters)
- `DatePicker`
- `Badge` (event type, score delta)

#### Low Trust Companies Page (`/trust/companies`)
**Features:**
- List of companies with low trust scores
- Card-based layout with trust score, trust level, recent events
- Actions: View details, Recalculate score

**API Calls:**
- `GET /api/v1/admin/trust/companies/low-score` (NEW ENDPOINT NEEDED)
- `POST /api/v1/admin/trust/recalculate/{companyId}` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Card`
- `Button`
- `Badge` (trust level)

---

### 9. Match Analytics (`/matches`)

#### Match List & Stats Page
**Features:**
- Statistics cards (total matches, acceptance rate, avg response time)
- Data table with columns: Applicant, Job, Company, Status, Matched Date, Actions
- Filters: Status, Date range
- Pagination

**API Calls:**
- `GET /api/v1/admin/matches` (NEW ENDPOINT NEEDED)
- `GET /api/v1/admin/matches/stats` (NEW ENDPOINT NEEDED)

**shadcn Components:**
- `Card` (stats)
- `Table`
- `Select` (filters)
- `DatePicker`
- `Badge` (status)

---

## Layout Components

### Sidebar Navigation
**Structure:**
- Dashboard (home icon)
- Users (users icon)
- Companies (building icon)
  - All Companies
  - Verifications
- Jobs (briefcase icon)
- Reviews (flag icon)
- Subscriptions (credit card icon)
- IAP (shopping cart icon)
  - Transactions
  - Webhooks
- Trust System (shield icon)
  - Events
  - Low Trust Companies
- Matches (heart icon)
- Settings (gear icon)

**shadcn Components:**
- Custom sidebar with `Button` (variant="ghost")
- `Collapsible` (for nested items)
- Icons from `lucide-react`

### Header
**Features:**
- Breadcrumbs
- User profile dropdown (logout)
- Notifications bell (future)

**shadcn Components:**
- `Breadcrumb`
- `DropdownMenu`
- `Avatar`

---

## Shared Components

### DataTable Component
**Purpose:** Reusable table with sorting, filtering, pagination

**Features:**
- TanStack Table integration
- Column sorting
- Row selection (optional)
- Pagination controls
- Loading state
- Empty state

**shadcn Components:**
- `Table`
- `Button` (pagination)
- `Select` (rows per page)

### StatusBadge Component
**Purpose:** Consistent status display

**Variants:**
- User status: active, banned
- Verification status: pending, approved, rejected
- Subscription status: active, cancelled, expired
- Match status: pending, accepted, declined, closed

**shadcn Components:**
- `Badge` with custom variants

### ConfirmationDialog Component
**Purpose:** Reusable confirmation for destructive actions

**Features:**
- Title, description props
- Confirm/Cancel buttons
- Loading state during action

**shadcn Components:**
- `AlertDialog`
- `Button`

---

## Authentication

### Login Page (`/login`)
**Features:**
- Email and password inputs
- Form validation
- Error handling
- Redirect to dashboard on success

**API Calls:**
- `POST /api/v1/auth/login`

**shadcn Components:**
- `Card`
- `Input`
- `Button`
- `Label`
- `Alert` (errors)

### Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

### Protected Routes
- Middleware to check authentication
- Redirect to login if not authenticated
- Check user role (must be moderator or super_admin)

---

## API Client Setup

### Axios Instance
```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Styling Guidelines

### Color Scheme
- Use shadcn/ui default theme (customizable via CSS variables)
- Primary color for actions
- Destructive color for delete/ban actions
- Muted colors for secondary information

### Typography
- Use Tailwind typography classes
- Consistent heading hierarchy
- Readable font sizes (minimum 14px for body text)

### Spacing
- Consistent padding and margins using Tailwind spacing scale
- Card padding: `p-6`
- Section spacing: `space-y-6`

### Responsive Design
- Mobile-first approach
- Sidebar collapses to hamburger menu on mobile
- Tables scroll horizontally on small screens
- Stack cards vertically on mobile

---

## Data Fetching Strategy

### Use React Query (TanStack Query)
- Cache API responses
- Automatic refetching
- Loading and error states
- Optimistic updates

### Example Hook
```typescript
// lib/hooks/use-users.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, banUser, unbanUser } from '@/lib/api/users';

export function useUsers(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => getUsers(filters),
  });
}

export function useBanUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => banUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

---

## Error Handling

### API Error Handling
- Display error messages from API response
- Fallback to generic error message
- Use toast notifications for errors

### Form Validation
- Use Zod schemas for validation
- Display field-level errors
- Disable submit button during submission

---

## Testing Considerations

### Unit Tests
- Test utility functions
- Test custom hooks
- Test form validation schemas

### Integration Tests
- Test API client functions
- Test authentication flow

### E2E Tests (Optional)
- Test critical user flows (login, ban user, approve verification)

---

## Performance Optimization

### Code Splitting
- Use Next.js dynamic imports for heavy components
- Lazy load charts and data tables

### Image Optimization
- Use Next.js `Image` component
- Optimize company logos and profile photos

### Caching
- Use React Query for API response caching
- Set appropriate stale times

---

## Deployment

### Environment Variables
```
NEXT_PUBLIC_API_URL=https://api.jobswipe.com
NEXT_PUBLIC_APP_NAME=JobSwipe Admin
```

### Build Command
```bash
npm run build
```

### Hosting
- Deploy to Vercel or similar platform
- Ensure environment variables are set

---

## Development Workflow

### Setup
```bash
npx create-next-app@latest admin-dashboard --typescript --tailwind --app
cd admin-dashboard
npx shadcn-ui@latest init
```

### Install Dependencies
```bash
npm install axios zustand @tanstack/react-query react-hook-form zod @hookform/resolvers
npm install recharts date-fns lucide-react
```

### Add shadcn Components
```bash
npx shadcn-ui@latest add button card input table select badge dialog alert-dialog dropdown-menu tabs
```

### Development Server
```bash
npm run dev
```

---

## Implementation Priority

### Phase 1: Core Setup (Week 1)
1. Project setup and configuration
2. Authentication (login, auth store, protected routes)
3. Layout (sidebar, header, breadcrumbs)
4. Dashboard home page with stats

### Phase 2: User & Company Management (Week 2)
5. User list and detail pages
6. Company list and detail pages
7. Verification queue page
8. Ban/unban functionality

### Phase 3: Content Moderation (Week 3)
9. Job posting management
10. Review moderation
11. Trust system pages

### Phase 4: Financial & Analytics (Week 4)
12. Subscription management
13. IAP transaction and webhook pages
14. Match analytics

### Phase 5: Polish & Testing (Week 5)
15. Error handling improvements
16. Loading states and skeletons
17. Responsive design refinements
18. Testing and bug fixes

---

## Additional Notes

### Accessibility
- Use semantic HTML
- Ensure keyboard navigation works
- Add ARIA labels where needed
- Test with screen readers

### Security
- Never store sensitive data in localStorage (only auth token)
- Validate all user inputs
- Sanitize data before display
- Use HTTPS in production

### Documentation
- Add JSDoc comments to complex functions
- Document API client functions
- Create README with setup instructions

---

## Success Criteria

The admin dashboard is complete when:
1. All high-priority pages are functional
2. Authentication and authorization work correctly
3. CRUD operations for users, companies, and content work
4. Data tables support filtering, sorting, and pagination
5. UI is responsive and accessible
6. Error handling is robust
7. Performance is acceptable (< 3s page load)

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TanStack Table](https://tanstack.com/table/latest)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
