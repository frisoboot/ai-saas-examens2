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
| Markdown/Math | react-markdown, remark-math, rehype-katex, KaTeX |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (JWT) |
| AI | Vercel AI Gateway → Google Gemini (`@ai-sdk/gateway`, `ai` SDK) |
| Payments | Mollie (subscriptions + one-time verification) |
| Email | Resend (transactional email) |
| Validation | Zod |
| Analytics | Vercel Analytics, Vercel Speed Insights |
| Testing | Vitest 4, Testing Library |
| Deployment | Vercel |

## Directory Structure

```
.
├── api/                         # Vercel serverless functions (backend)
│   ├── admin/                   # Admin-only endpoints
│   │   ├── activation-codes.ts  # Manage activation codes
│   │   ├── feedback.ts          # View user-submitted feedback
│   │   ├── health-check.ts      # System health check
│   │   ├── subscriptions.ts     # Subscription management
│   │   └── users.ts             # User management
│   ├── utils/
│   │   ├── cors.ts              # CORS whitelist config
│   │   ├── emailService.ts      # Transactional email via Resend
│   │   └── rateLimiter.ts       # In-memory rate limiter
│   ├── activate-code.ts         # Redeem activation code (authenticated)
│   ├── cancel-subscription.ts
│   ├── check-payment-status.ts
│   ├── check-subscription.ts
│   ├── create-checkout.ts       # Mollie checkout initiation
│   ├── forgot-password.ts       # Password reset email
│   ├── gemini.ts                # AI proxy (non-streaming)
│   ├── gemini-stream.ts         # AI proxy with SSE streaming
│   ├── mollie-webhook.ts        # Payment webhook handler
│   ├── register-with-code.ts    # Register via activation code (no payment)
│   ├── resubscribe.ts           # Resubscription for expired accounts
│   └── submit-feedback.ts       # User feedback submission
├── components/                  # React components
│   ├── exam/                    # Exam result sub-components
│   │   ├── ExamScoreCards.tsx
│   │   ├── ExamSubmitting.tsx
│   │   ├── ExamSummaryCard.tsx
│   │   ├── QuestionReviewCard.tsx
│   │   └── index.ts
│   ├── landing/
│   │   └── animations.css
│   ├── legal/
│   │   ├── PrivacyPolicy.tsx
│   │   └── TermsOfService.tsx
│   ├── ActivationCodeForm.tsx   # Activation code redemption form
│   ├── AdminActivationCodes.tsx # Admin: manage activation codes
│   ├── AdminDashboard.tsx       # Admin panel (question management, imports, library)
│   ├── AdminFeedback.tsx        # Admin: view user feedback
│   ├── AdminHealthCheck.tsx     # Admin: health check UI
│   ├── AdminStudentManagement.tsx
│   ├── BulkImportQuestions.tsx  # CSV/JSON/AI question import
│   ├── Button.tsx               # Reusable button component
│   ├── CheckoutForm.tsx         # Registration + Mollie payment
│   ├── ExamBuilder.tsx          # Question CRUD editor
│   ├── ExamLibrary.tsx          # Browse questions/exams
│   ├── ExamTaker.tsx            # Exam-taking interface with timer
│   ├── FeedbackPage.tsx         # User feedback submission page
│   ├── FeedbackWidget.tsx       # Floating feedback widget (appears in app)
│   ├── FlashcardGeneratorMenu.tsx  # AI flashcard generation menu
│   ├── FlashcardStudy.tsx       # Flashcard study mode
│   ├── ForgotPasswordPage.tsx
│   ├── ImageOverview.tsx        # Image management overview (admin)
│   ├── LandingPage.tsx          # Legacy landing page
│   ├── LandingPageNew.tsx       # Current landing page
│   ├── LoadingScreen.tsx        # Full-page loading indicator
│   ├── LoginPage.tsx
│   ├── LookalikeGeneratorMenu.tsx  # AI lookalike exam generator menu
│   ├── PaymentCallback.tsx
│   ├── PaymentSuccess.tsx       # Post-payment success page
│   ├── PdfViewer.tsx            # PDF viewer (exam tekstboekjes/bijlagen)
│   ├── ResetPasswordPage.tsx
│   ├── SEO.tsx                  # SEO meta tags component
│   ├── StudentDashboard.tsx
│   ├── StudentDifficultyOverview.tsx  # Per-topic difficulty stats
│   ├── SubjectChat.tsx          # AI tutoring chat
│   ├── SubjectOptions.tsx       # Subject selector UI
│   ├── SubjectPackageSettings.tsx    # Subject package management
│   └── SubscriptionSettings.tsx
├── contexts/                    # React Context providers
│   ├── AuthContext.tsx          # Auth state (user, session, profile, isAdmin)
│   └── NotificationContext.tsx  # Toast notification system
├── services/                    # Business logic & API clients
│   ├── examData.ts              # EXAM_TOPICS constant (per-subject topic lists)
│   ├── flashcardService.ts
│   ├── geminiService.ts         # AI feature client (calls /api/gemini + /api/gemini-stream)
│   ├── imageStorageService.ts
│   ├── importService.ts         # CSV/JSON import logic
│   ├── progressService.ts       # Student progress tracking
│   ├── storageService.ts        # Question CRUD via Supabase
│   ├── subjectPreferencesService.ts  # User subject preference persistence
│   ├── subscriptionService.ts   # Subscription API client
│   ├── supabaseService.ts       # Database operations (questions, profiles, results)
│   └── worksheetStorageService.ts    # Worksheet/PDF attachment storage
├── database/                    # SQL schema and migrations
│   ├── supabase-schema.sql      # Base schema
│   ├── subscriptions-schema.sql # Payment tables
│   ├── migration-secure-rls-v3-FINAL.sql  # Production RLS policies
│   ├── migration-activation-codes.sql
│   ├── migration-add-bijlage-pdf.sql
│   ├── migration-add-exam-links.sql
│   ├── migration-add-exam-pdf.sql
│   ├── migration-add-kaart-pdf.sql
│   ├── migration-add-section-fields.sql
│   ├── migration-add-selected-subjects.sql
│   ├── migration-add-worksheet-fields.sql
│   ├── migration-ai-study-feedback.sql
│   ├── migration-fix-subscriptions-rls.sql
│   ├── migration-pricing-plans.sql
│   ├── migration-trial-and-quarterly.sql
│   └── add-user-feedback.sql
├── tests/                       # Vitest test files
│   ├── setup.ts                 # Test env setup (mocks for env, localStorage)
│   ├── api/endpoints.test.ts
│   ├── services/auth.test.ts
│   ├── services/subscription.test.ts
│   ├── services/supabaseService.test.ts
│   └── database/connection.test.ts
├── constants/
│   └── subjects.ts              # Subject list
├── utils/                       # Helper functions
│   ├── imageUtils.ts
│   ├── markdownComponents.tsx   # Custom react-markdown renderers (LaTeX, tables)
│   ├── sanitize.ts
│   ├── sortExamQuestions.ts     # Sorts questions by section/number
│   └── subjectIcons.ts
├── public/                      # Static assets + SEO landing pages
│   ├── blog/                    # Blog post HTML pages (SEO)
│   └── <subject>-oefenen/       # Per-subject SEO landing pages
├── docs/                        # Extended documentation
├── App.tsx                      # Main router + route guard components
├── index.tsx                    # React entry point (providers: BrowserRouter, Helmet, Auth, Notifications)
├── types.ts                     # All TypeScript interfaces
├── vite.config.ts               # Vite + Vitest config
├── vercel.json                  # Deployment config (rewrites, security headers, function runtime)
└── .env.example                 # Environment variable template
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
npm run test:ui          # Vitest UI browser interface
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
- Students can register via two flows: (1) Mollie checkout (payment), or (2) activation code (`/activate` route).
- `AuthContext.tsx` exposes `useAuth()` hook with: `user`, `session`, `profile`, `isAuthenticated`, `isAdmin`, `signIn()`, `signOut()`, `refreshProfile()`.
- Protected routes: `<ProtectedRoute>` requires auth, `<AdminRoute>` requires auth + admin email, `<SubscriptionRoute>` requires auth + active subscription.

### Route Guards
Three route guard components are defined in `App.tsx`:
- `<ProtectedRoute>` — redirects unauthenticated users to `/login`
- `<AdminRoute>` — requires authenticated + admin email
- `<SubscriptionRoute>` — requires authenticated + active subscription; redirects to `/settings` if subscription is inactive

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
- Core tables: `questions`, `exam_results`, `student_profiles`, `student_progress`, `subscriptions`, `payments`, `pending_registrations`, `activation_codes`, `user_feedback`.
- Schema files in `/database/`. The production-ready RLS policies are in `migration-secure-rls-v3-FINAL.sql`.
- Service role key is used server-side only for admin operations and webhook handlers.

### AI Integration
- Frontend calls `services/geminiService.ts` which POSTs to `/api/gemini` or streams from `/api/gemini-stream`.
- Both `/api/gemini.ts` and `/api/gemini-stream.ts` proxy to Vercel AI Gateway via `@ai-sdk/gateway` (never exposes API keys to browser).
- **Non-streaming actions** (`/api/gemini`): `gradeOpenQuestion`, `generateFlashcards`, `generateLookalikeQuestions`, `getExplanation`, `generateExamSummary`, `chat`, `generateStudyFeedback`.
- **Streaming** (`/api/gemini-stream`): SSE endpoint for lookalike exam generation; questions are delivered one-by-one as they are parsed. The frontend reads the stream via `streamLookalikeExamQuestions()` in `geminiService.ts`. The `ExamSession.isStreaming` flag tracks whether generation is still in progress.
- Model selection: `GEMINI_MODEL_PRO` (default `google/gemini-2.5-pro`) is used for exact sciences (Wiskunde A/B, Natuurkunde, Scheikunde) at HAVO/VWO level. All other cases use `GEMINI_MODEL` (default `google/gemini-2.0-flash`).

### Payments
- Mollie handles subscriptions (€12.50/month) and initial €1 verification payments.
- Standard flow: CheckoutForm → `/api/create-checkout` → Mollie → `/api/mollie-webhook` → creates Supabase user + trial.
- Resubscription flow: SubscriptionSettings → `/api/resubscribe` → Mollie → webhook reactivates.
- Passwords are AES-256-GCM encrypted during the checkout flow and stored temporarily in `pending_registrations`.

### Activation Codes
An alternative registration path that bypasses Mollie entirely:
- Admin creates codes via `AdminActivationCodes` → `api/admin/activation-codes.ts`.
- New users register at `/activate` via `ActivationCodeForm` → `api/register-with-code.ts`.
- Existing users redeem a code at `/settings` → `api/activate-code.ts`.
- Codes are stored in the `activation_codes` DB table and marked used after redemption.

### Email
- Transactional email via Resend (`api/utils/emailService.ts`).
- Used for password reset (`api/forgot-password.ts`) and potentially other notifications.
- Requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars.

### Markdown and Math Rendering
- Question text, model answers, and AI responses may contain LaTeX math (`$...$`, `$$...$$`).
- Use `react-markdown` with `remark-math` + `rehype-katex` plugins for rendering.
- Custom renderers are defined in `utils/markdownComponents.tsx`.

## Type System

All shared TypeScript types are in `types.ts`. Key types:

- `Question` - Exam question with MC/open variants, sections, worksheets, PDFs, external links
- `ExamResult` - Completed exam with answers and scores
- `StudentProfile` - Student info (name, level, email, selectedSubjects)
- `ExamSession` - Active exam state (questions, answers, timer, streaming flags, feedback mode)
- `FlashcardSession` - Active flashcard study state
- `StudentProgress` - Per-subject progress stats
- `TopicAnalysis` - Per-topic score breakdown
- `AIStudyFeedback` - AI-generated personalised study advice
- `YearExam` - Year-based exam metadata
- `StudentLevel` = `'VMBO-TL' | 'HAVO' | 'VWO'`
- `QuestionType` = `'MULTIPLE_CHOICE' | 'OPEN'`
- `ExamType` = `'practice' | 'official_exam'`
- `ExamMode` = `'BY_SUBJECT' | 'BY_YEAR'`
- `FeedbackMode` = `'coach' | 'exam'` — coach = instant per-question feedback, exam = all at the end
- `ImportType` = `'csv' | 'json' | 'ai_pdf'`

Use the path alias `@/*` (maps to project root) for imports.

## Environment Variables

**Public (browser-safe, `VITE_` prefix):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (safe, RLS-protected)
- `VITE_ADMIN_EMAILS` - Comma-separated admin email addresses

**Server-side only (NO `VITE_` prefix, never reaches the browser):**
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key for server endpoints
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway key
- `MOLLIE_API_KEY` - Mollie payment API key (use `test_...` for dev, `live_...` for production)
- `RESEND_API_KEY` - Resend email service API key
- `RESEND_FROM_EMAIL` - Sender address, e.g. `AI Examentrainer <noreply@ai-examentrainer.nl>`
- `GEMINI_MODEL` - Optional model override (default: `google/gemini-2.0-flash`)
- `GEMINI_MODEL_PRO` - Optional pro model override (default: `google/gemini-2.5-pro`)

**Security rule**: Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are explicitly exposed in `vite.config.ts`. Never add `VITE_` prefix to secret keys.

## Coding Conventions

### Naming
- **Components**: PascalCase files and exports (`StudentDashboard.tsx`)
- **Services**: camelCase with "Service" suffix (`supabaseService.ts`)
- **Functions**: camelCase (`getQuestions`, `createCheckout`)
- **Types/Interfaces**: PascalCase (`StudentProfile`, `ExamSession`)
- **Constants**: UPPER_SNAKE_CASE (`ALLOWED_ORIGINS`, `EXAM_TOPICS`)
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
| `/activate` | ActivationCodeForm | Public |
| `/forgot-password` | ForgotPasswordPage | Public |
| `/reset-password` | ResetPasswordPage | Public |
| `/privacy` | PrivacyPolicy | Public |
| `/voorwaarden` | TermsOfService | Public |
| `/payment/callback` | PaymentCallback | Public |
| `/payment/success` | PaymentSuccess | Public |
| `/dashboard` | StudentDashboard | SubscriptionRoute |
| `/exam` | ExamTaker | SubscriptionRoute (needs active session) |
| `/chat` | SubjectChat | SubscriptionRoute (needs selected subject) |
| `/flashcards` | FlashcardStudy | SubscriptionRoute (needs active session) |
| `/feedback` | FeedbackPage | SubscriptionRoute |
| `/settings` | SubscriptionSettings | ProtectedRoute |
| `/admin` | AdminDashboard | AdminRoute |

## Security Considerations

- RLS enforced on all database tables. Students can only read/write their own data.
- API keys (`SUPABASE_SERVICE_ROLE_KEY`, `AI_GATEWAY_API_KEY`, `MOLLIE_API_KEY`, `RESEND_API_KEY`) are server-side only.
- CORS whitelist allows only `ai-examentrainer.nl`, Vercel preview domains, and localhost.
- Rate limiting on registration (10/hour per IP), AI calls, and activation code attempts (10/15 min per IP).
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
- `docs/json-import-format.md` - JSON question import format specification
- `docs/ai-extract-prompt.md` - AI PDF extraction prompt
- `database/SECURITY-FIX-README.md` - RLS migration guide
- `database/SUPABASE_STORAGE_SETUP.md` - Supabase Storage bucket configuration
