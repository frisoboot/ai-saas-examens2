# CLAUDE.md - AI Examentrainer Codebase Guide

## Project Overview

AI Examentrainer is a Dutch exam preparation SaaS platform. Students practice for Dutch secondary school exams (VMBO-TL, HAVO, VWO) using real exam questions, AI-generated practice, flashcards, and an AI tutoring chat. The platform uses Supabase for auth/database, Vercel AI Gateway for LLM features, and Mollie for subscription payments.

**Domain**: `ai-examentrainer.nl`
**Language**: The UI and most documentation are in Dutch. Code (variables, comments in code) uses English.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, TypeScript 5.8 |
| Build | Vite 6 |
| Styling | Tailwind CSS, Lucide React icons |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (JWT) |
| AI | Vercel AI Gateway → Google Gemini |
| Payments | Mollie (subscriptions + one-time verification) |
| Testing | Vitest 4, Testing Library |
| Deployment | Vercel |

## Directory Structure

```
.
├── api/                    # Vercel serverless functions (backend)
│   ├── admin/              # Admin-only endpoints (users, health-check, subscriptions)
│   ├── utils/              # CORS config, rate limiter
│   ├── gemini.ts           # AI proxy (grading, flashcards, explanations)
│   ├── create-checkout.ts  # Mollie checkout initiation
│   ├── mollie-webhook.ts   # Payment webhook handler
│   ├── check-payment-status.ts
│   ├── check-subscription.ts
│   └── cancel-subscription.ts
├── components/             # React components
│   ├── exam/               # Exam result sub-components (ScoreCards, Summary, Review)
│   ├── landing/            # Landing page animations
│   ├── AdminDashboard.tsx  # Admin panel (question management, imports, library)
│   ├── StudentDashboard.tsx
│   ├── ExamTaker.tsx       # Exam-taking interface with timer
│   ├── ExamBuilder.tsx     # Question CRUD editor
│   ├── ExamLibrary.tsx     # Browse questions/exams
│   ├── SubjectChat.tsx     # AI tutoring chat
│   ├── FlashcardStudy.tsx  # Flashcard study mode
│   ├── BulkImportQuestions.tsx  # CSV/JSON question import
│   ├── CheckoutForm.tsx    # Registration + payment
│   ├── LoginPage.tsx
│   └── ...                 # Other UI components
├── contexts/               # React Context providers
│   ├── AuthContext.tsx      # Auth state (user, session, profile, isAdmin)
│   └── NotificationContext.tsx  # Toast notification system
├── services/               # Business logic & API clients
│   ├── supabaseService.ts  # Database operations (questions, profiles, results)
│   ├── geminiService.ts    # AI feature client (calls /api/gemini)
│   ├── storageService.ts   # Question CRUD via Supabase
│   ├── subscriptionService.ts  # Subscription API client
│   ├── progressService.ts  # Student progress tracking
│   ├── flashcardService.ts
│   ├── importService.ts    # CSV/JSON import logic
│   ├── imageStorageService.ts
│   └── ...
├── database/               # SQL schema and migrations
│   ├── supabase-schema.sql # Base schema (questions, exam_results, student_profiles)
│   ├── subscriptions-schema.sql  # Payment tables
│   ├── migration-secure-rls-v3-FINAL.sql  # Production RLS policies
│   └── ...                 # Incremental migrations
├── tests/                  # Vitest test files
│   ├── setup.ts            # Test env setup (mocks for env, localStorage)
│   ├── api/endpoints.test.ts
│   ├── services/           # Service unit tests
│   └── database/           # Database connection tests
├── constants/              # Shared constants
│   └── subjects.ts         # Subject list
├── utils/                  # Helper functions
│   ├── sanitize.ts
│   ├── imageUtils.ts
│   └── subjectIcons.ts
├── docs/                   # Extended documentation
├── App.tsx                 # Main router component with route definitions
├── index.tsx               # React entry point (providers: BrowserRouter, Helmet, Auth, Notifications)
├── types.ts                # All TypeScript interfaces (Question, ExamResult, StudentProfile, etc.)
├── vite.config.ts          # Vite + Vitest config
├── vercel.json             # Deployment config (rewrites, security headers, function runtime)
└── .env.example            # Environment variable template
```

## Key Commands

```bash
# Development
npm run dev              # Start Vite dev server on port 3000
vercel dev               # Recommended: dev server WITH serverless API functions

# Build
npm run build            # Production build to dist/

# Testing
npm run test             # Run all tests once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (services/ and api/)

# Preview
npm run preview          # Preview production build locally
```

## Architecture Decisions

### Single-Repo Full-Stack
This is NOT a monorepo. Frontend (React) and backend (Vercel serverless) share one `package.json` and `tsconfig.json`. Frontend compiles to `dist/`, API functions are auto-transpiled by Vercel.

### State Management
- **AuthContext**: Global auth state (user, session, profile, isAdmin). Wraps entire app.
- **NotificationContext**: Toast/alert system. Wraps entire app.
- **App.tsx local state**: Exam sessions, flashcard sessions, chat subject. Passed as props.
- No Redux/Zustand. React Context + component state is sufficient for this app.

### Authentication
- **Supabase Auth only** - no custom auth, no fallbacks.
- Admin role is determined by checking `user.email` against `VITE_ADMIN_EMAILS` env var (comma-separated list). There is no database role column.
- Students register through the Mollie checkout flow, which creates their Supabase auth account.
- `AuthContext.tsx` exposes `useAuth()` hook with: `user`, `session`, `profile`, `isAuthenticated`, `isAdmin`, `signIn()`, `signOut()`, `refreshProfile()`.
- Protected routes: `<ProtectedRoute>` requires auth, `<AdminRoute>` requires auth + admin email.

### API Endpoints
All endpoints are Vercel serverless functions in `/api/`. They follow this pattern:
1. CORS handling (whitelist in `api/utils/cors.ts`)
2. HTTP method check
3. Auth verification (Bearer token + admin email check for admin endpoints)
4. Rate limiting where applicable
5. Input validation
6. Business logic
7. JSON response: `{ success: true, result: ... }` or `{ error: "message" }`

### Database
- PostgreSQL via Supabase with Row Level Security (RLS) on all tables.
- Core tables: `questions`, `exam_results`, `student_profiles`, `student_progress`, `subscriptions`, `payments`, `pending_registrations`.
- Schema files in `/database/`. The production-ready RLS policies are in `migration-secure-rls-v3-FINAL.sql`.
- Service role key is used server-side only for admin operations and webhook handlers.

### AI Integration
- Frontend calls `services/geminiService.ts` which POSTs to `/api/gemini`.
- `/api/gemini.ts` proxies to Vercel AI Gateway (never exposes API keys to browser).
- Actions: `gradeOpenQuestion`, `generateFlashcards`, `generateLookalikeQuestions`, `explainQuestion`.
- Model selection varies by subject and student level. Configurable via `GEMINI_MODEL` / `GEMINI_MODEL_PRO` env vars.

### Payments
- Mollie handles subscriptions (€12.50/month) and initial €1 verification payments.
- Flow: CheckoutForm → `/api/create-checkout` → Mollie → `/api/mollie-webhook` → creates Supabase user + trial.
- Passwords are AES-256-GCM encrypted during the checkout flow and stored temporarily in `pending_registrations`.

## Type System

All shared TypeScript types are in `types.ts`. Key types:

- `Question` - Exam question with MC/open variants, sections, worksheets, images
- `ExamResult` - Completed exam with answers and scores
- `StudentProfile` - Student info (name, level, email, selectedSubjects)
- `ExamSession` - Active exam state (questions, answers, timer)
- `FlashcardSession` - Active flashcard study state
- `StudentLevel` = `'VMBO-TL' | 'HAVO' | 'VWO'`
- `QuestionType` = `'MULTIPLE_CHOICE' | 'OPEN'`
- `ExamType` = `'practice' | 'official_exam'`

Use the path alias `@/*` (maps to project root) for imports.

## Environment Variables

**Public (browser-safe, `VITE_` prefix):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (safe, RLS-protected)
- `VITE_ADMIN_EMAILS` - Comma-separated admin email addresses

**Server-side only (NO `VITE_` prefix, never reaches the browser):**
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key for server endpoints
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway key
- `MOLLIE_API_KEY` - Mollie payment API key
- `GEMINI_MODEL` - Optional model override (default: `google/gemini-2.0-flash`)
- `GEMINI_MODEL_PRO` - Optional pro model for specific subjects

**Security rule**: Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are explicitly exposed in `vite.config.ts`. Never add `VITE_` prefix to secret keys.

## Coding Conventions

### Naming
- **Components**: PascalCase files and exports (`StudentDashboard.tsx`)
- **Services**: camelCase with "Service" suffix (`supabaseService.ts`)
- **Functions**: camelCase (`getQuestions`, `createCheckout`)
- **Types/Interfaces**: PascalCase (`StudentProfile`, `ExamSession`)
- **Constants**: UPPER_SNAKE_CASE (`ALLOWED_ORIGINS`)
- **DB tables/columns**: snake_case (`student_profiles`, `exam_results`)

### Component Patterns
- Functional components only (no class components)
- Props passed via typed interfaces
- Event handlers passed as props from parent components
- `useAuth()` hook for auth state in any component

### Service Layer Pattern
```typescript
export const doSomething = async (params: Type): Promise<ReturnType> => {
  try {
    // Call Supabase or API
    return result;
  } catch (error) {
    console.error('Error description:', error);
    return fallbackValue;
  }
};
```

### API Endpoint Pattern
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS
  // 2. Method check (GET/POST/DELETE)
  // 3. Auth (Bearer token + admin check for admin endpoints)
  // 4. Rate limit
  // 5. Validate input
  // 6. Business logic
  // 7. Return JSON
}
```

### Error Handling
- Services: try/catch with `console.error`, return safe defaults
- API: HTTP status codes (400 bad input, 401 unauth, 403 forbidden, 429 rate limit, 500 server error)
- UI: Toast notifications via `NotificationContext` for user-facing errors

## Testing

- Framework: Vitest with jsdom environment
- Setup: `tests/setup.ts` mocks `import.meta.env`, `localStorage`, and console methods
- Test files mirror source structure: `tests/services/`, `tests/api/`, `tests/database/`
- Coverage targets: `services/**/*.ts` and `api/**/*.ts`
- External dependencies (Supabase, Mollie) are mocked in tests

## Routing

Defined in `App.tsx`:

| Route | Component | Access |
|-------|-----------|--------|
| `/` | LandingPageNew | Public |
| `/login` | LoginPage | Public (redirects if authed) |
| `/checkout` | CheckoutForm | Public |
| `/forgot-password` | ForgotPasswordPage | Public |
| `/reset-password` | ResetPasswordPage | Public |
| `/payment/callback` | PaymentCallback | Public |
| `/dashboard` | StudentDashboard | Protected |
| `/exam` | ExamTaker | Protected (needs active session) |
| `/chat` | SubjectChat | Protected (needs selected subject) |
| `/flashcards` | FlashcardStudy | Protected (needs active session) |
| `/settings` | SubscriptionSettings | Protected |
| `/admin` | AdminDashboard | Admin only |

## Security Considerations

- RLS enforced on all database tables. Students can only read/write their own data.
- API keys (`SUPABASE_SERVICE_ROLE_KEY`, `AI_GATEWAY_API_KEY`, `MOLLIE_API_KEY`) are server-side only.
- CORS whitelist allows only `ai-examentrainer.nl`, Vercel preview domains, and localhost.
- Rate limiting on registration (10/hour per IP) and AI calls.
- Security headers set in `vercel.json` (HSTS, X-Frame-Options DENY, nosniff, XSS protection).
- Passwords are AES-256-GCM encrypted during the checkout flow before being stored in `pending_registrations`.
- Read `SECURITY.md` for the full security guide.

## Related Documentation

- `DEVELOPMENT.md` - Dev setup, architecture, troubleshooting
- `SECURITY.md` - Authentication setup, security measures, environment variable guide
- `TESTPLAN.md` - Manual test checklist
- `SEO_GUIDE.md` - SEO configuration
- `docs/SUPABASE_AUTH_SETUP.md` - Supabase auth configuration details
- `docs/VERCEL_DEPLOYMENT.md` - Deployment guide
- `database/SECURITY-FIX-README.md` - RLS migration guide
