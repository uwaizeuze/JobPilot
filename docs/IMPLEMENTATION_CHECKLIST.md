# Implementation checklist

Mark an item done only when it works and is tested. Do not mark a feature done because UI exists.

## Phase 1 — Project setup, architecture, UI foundation

- [x] Inspect repository (was empty)
- [x] Next.js App Router + TypeScript strict + Tailwind
- [x] shadcn/ui-style primitives, Framer Motion, Lucide
- [x] Folder architecture (`app`, `components`, `lib`, `services`, `providers`, `models`, `worker`, `tests`, `docs`)
- [x] Light / Dark / System theme with `next-themes`, persisted, no FOUC script via next-themes
- [x] Theme toggle in header and profile settings (Sun, Moon, Monitor)
- [x] Design tokens: background, foreground, card, border, muted, primary, accent, destructive, success, warning
- [x] Foundation shells for landing, auth, dashboard, tracker, jobs, resume/cover-letter editors, interviews, settings
- [x] Unit test for theme provider persistence
- [x] Playwright theme toggle + persistence + page walk in both themes
- [x] `.env.example` placeholders only
- [ ] Authentication (Phase 2)
- [ ] Database models (Phase 2)

## Phase 2 — Auth, profiles, database

- [x] Secure session auth with `jose` (JWT) + `bcryptjs` password hashing + httpOnly cookies
- [x] Route handlers: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- [x] Server-side route protection middleware (`middleware.ts`) redirecting unauthenticated users to `/login`
- [x] MongoDB + Mongoose models with validation, unique constraints, and indexes (`User`, `ProfessionalProfile`, `UserPreference`, `AuditLog`, `Job`, `JobAnalysis`, `Resume`, `ResumeVersion`, `CoverLetter`, `Application`, `ApplicationEvent`, `JobSourceConnection`, `AgentTask`, `Notification`, `InterviewPrepPack`, `MockInterviewSession`, `InterviewAnswer`)
- [x] Deterministic profile completeness calculator (`lib/profile-completeness.ts`)
- [x] ProfessionalProfile CRUD endpoints (`/api/profile` GET/PUT/DELETE) with Zod validation and AuditLog entries
- [x] GDPR data export endpoint (`/api/profile/export`) and deletion controls
- [x] Interactive ProfileEditor UI with live completeness progress bar, skills manager, and export/delete controls
- [x] Unit tests for auth hashing/signing, profile completeness scoring, and Mongoose schema constraints (14 tests passed)
- [x] Playwright E2E tests for auth redirection, register form, and login error handling (5 tests passed)

## Phase 3 — Resume upload and extraction

- [x] Document parser (`lib/document-parser.ts`) supporting PDF and DOCX text extraction
- [x] Security validations: magic bytes verification (`%PDF`, `PK\x03\x04`), 5MB size limit, content sanitization
- [x] Fact-grounded resume extractor (`lib/resume-extractor.ts`) parsing contact, summary, skills, employment, and education without hallucinations
- [x] Resume upload API (`POST /api/resume/upload`) with temporary staging that does NOT overwrite master profile without candidate review
- [x] Candidate Verification Barrier (`POST /api/resume/confirm`) requiring candidate review and confirmation before committing to verified master profile
- [x] Resume library and management API (`GET /api/resume`, `DELETE /api/resume?id=...`)
- [x] Interactive UI: `ResumeUploader` with dropzone, review barrier modal, and `ResumeLibrary` on `/resumes`
- [x] Unit tests for document parser security/magic bytes and grounded resume extraction (24 tests passed)
- [x] Playwright E2E test for resume library and upload dropzone (6 tests passed)

## Phase 4 — Job discovery

- [x] Provider adapter interface (`providers/job-source-provider.interface.ts`) defining `JobSourceProvider`, `ProviderCapabilities`, `ApplyTier`, `JobSearchCriteria`, and `DiscoveredJobItem`
- [x] Provider registry (`providers/provider-registry.ts`) registering Manual, Greenhouse, Lever, LinkedIn, Indeed, and Naukri providers
- [x] Live public career board providers: Greenhouse (`providers/greenhouse-provider.ts`) and Lever (`providers/lever-provider.ts`) fetching verified public JSON feeds
- [x] Honest connection status and capabilities for LinkedIn, Indeed, and Naukri (`tier: "MANUAL"`, `discover: false`, `submit: false`) with strict anti-bot and ToS compliance
- [x] Manual import provider (`providers/manual-import-provider.ts`) and dialog (`components/jobs/manual-job-import-dialog.tsx`) with URL/text import at `/api/jobs/import`
- [x] ATS board discovery dialog (`components/jobs/discover-jobs-dialog.tsx`) and API endpoint (`POST /api/jobs/discover`)
- [x] Job deduplication engine (`JobDiscoveryService.generateDuplicateGroupId`) preventing duplicate records across URLs and company/title groups
- [x] Job discovery UI (`/jobs`) with live search, work mode filter, refresh, pagination, and `JobCard` grid
- [x] Job preview details page (`/jobs/preview`) with single-job fetch endpoint (`/api/jobs/[id]`)
- [x] Integrations dashboard (`/settings/integrations`) rendering live capability flags and the three-tier application architecture
- [x] Unit tests for deduplication, provider catalog, and ATS feed parsers (36 unit tests passed)
- [x] Playwright E2E tests for `/jobs` search/modal and `/settings/integrations` capability flags (8 E2E tests passed)

## Phase 5 — AI analysis and matching

- [x] Encrypted BYOK key management (`lib/crypto.ts`) using AES-256-GCM, zero-trust key isolation, and masking
- [x] AI Provider abstraction (`lib/ai/ai-provider.interface.ts` & `lib/ai/openai-provider.ts`) with prompt sanitization, live key validation, and token consumption tracking
- [x] Structured job analysis engine (`services/job-analysis.service.ts`) extracting skills, experience, education, responsibilities, seniority, and mandatory conditions with Zod validation and deterministic fallback
- [x] Deterministic job matching and ranking engine (`services/job-matching.service.ts`) computing explainable component scores (skills, experience, location, title, education) without arbitrary LLM scoring
- [x] Separate mandatory eligibility evaluation flagging clearance, authorization, or experience gaps without corrupting numerical match percentages
- [x] AI settings API (`GET`, `POST`, `DELETE /api/settings/ai`) managing encrypted keys, token budgets, and emergency pause
- [x] Job analysis & match endpoints (`POST /api/jobs/[id]/analyze`, `GET /api/jobs/[id]/match`)
- [x] Interactive AI Agent settings UI (`/settings/agent`) with BYOK key validation, token consumption progress bar, and candidate consent policies
- [x] Enhanced Job Preview details page (`/jobs/preview`) with "Analyze & Calculate Match" button, match score gauge, component breakdown, matching/missing skills badges, and eligibility alerts
- [x] Job Discovery catalog updates (`/jobs`) with match score badges and minimum match filters (60%+, 80%+)
- [x] Unit tests for AES-256-GCM crypto security and deterministic match scoring (45 unit tests passed across 9 test files)
- [x] Playwright E2E tests for AI agent settings and job match preview fallback (10 E2E tests passed)

## Phase 6 — Resume and cover letter generation

- [x] Grounded resume tailoring service (`services/resume-generation.service.ts`) prioritizing verified skills and achievements without hallucinating unverified experience
- [x] Deterministic unsupported-claims detector (`detectUnsupportedClaims`) verifying every skill, employer, and degree against the master profile
- [x] Cover letter generation service (`services/cover-letter.service.ts`) producing tone-aware drafts (`professional`, `enthusiastic`, `concise`) grounded in verified candidate achievements
- [x] Binary document generation engine (`lib/document-exporter.ts`) using `pdfkit` and `docx` to generate valid PDF and DOCX files with magic bytes verification
- [x] Resume versioning system with `ResumeVersion` tracking version numbers, tailored content, and detected unsupported claims
- [x] Resume tailoring endpoints (`POST /api/resume/tailor`, `GET /api/resume/versions`, `GET/DELETE /api/resume/versions/[id]`)
- [x] Cover letter draft and update endpoints (`GET/PUT /api/cover-letter`, `POST /api/cover-letter/generate`)
- [x] Binary streaming document download endpoints (`GET /api/resume/versions/[id]/export?format=pdf|docx`, `GET /api/cover-letter/export?format=pdf|docx`)
- [x] Interactive Tailored Resume Editor (`/resumes/preview`) with version history selector, unsupported claims alert, structured section preview, and one-click PDF/DOCX downloads
- [x] Interactive Cover Letter Editor (`/cover-letters/preview`) with tone variations selector, word/char counters, live editing, save draft, and one-click PDF/DOCX downloads
- [x] Unit tests for binary PDF/DOCX magic byte validation and unsupported claims detector (52 unit tests passed across 11 test files)
- [x] Playwright E2E tests for resume editor, empty states, and cover letter tone variations (12 E2E tests passed)

## Phase 7 — Tracker and application preparation

- [x] Application state machine (`services/application-state-machine.ts`) enforcing valid lifecycle transitions (`DISCOVERED` through `OFFER`/`REJECTED`/`CANCELLED`) and Kanban categorization
- [x] Duplicate detection service (`services/duplicate-detection.service.ts`) checking exact jobId, URL cross-posting, `duplicateGroupId`, and 90-day cooldown for same company and title
- [x] Grounded application preparation service (`services/application-preparation.service.ts`) compiling verified contact info, tailored resume version, cover letter draft, work authorization, and preflight checklist
- [x] Application tracking service (`services/application-tracking.service.ts`) providing full lifecycle CRUD, immutable event auditing, recruiter contact, and interview scheduling
- [x] Applications API routes (`GET/POST /api/applications`, `GET/PATCH/DELETE /api/applications/[id]`)
- [x] Application event timeline API (`GET/POST /api/applications/[id]/events`)
- [x] Application preparation trigger API (`POST /api/applications/[id]/prepare`)
- [x] Preflight duplicate check API (`POST /api/applications/check-duplicate`)
- [x] Interactive Application Tracker page (`/tracker`) with Kanban Board and Pipeline Table views, search, status filtering, and metric summary counters
- [x] Application detail modal (`components/tracker/application-detail-dialog.tsx`) with state machine transitions, preparation checklist, recruiter contacts, and activity audit timeline
- [x] "Track in Pipeline" action button on Job Preview page (`/jobs/preview`) with active tracking status badge
- [x] Unit tests for state machine, duplicate detection, and application preparation (65 unit tests passed across 14 test files)
- [x] Playwright E2E tests for Application Tracker, Kanban/Table toggle, and metric cards (13 E2E tests passed)

## Phase 8 — Agent orchestration and authorized apply

- [x] Structured Tool Registry (`services/tool-registry.ts`) implementing all 20 specification tools (Section 9.3) with typed Zod schemas, execution timeouts, and server-side `userId` injection preventing model permission hijacking
- [x] Three-tier application dispatch engine (`services/application-submission.service.ts`):
  - **Tier 1 (MANUAL)**: Preserves safety for LinkedIn, Indeed, and Naukri by generating tailored assets, enforcing portal review, and never attempting bot evasion
  - **Tier 2 (PREFILL_ASSISTED)**: Playwright-powered browser automation (`services/browser-automation.service.ts`) mapping verified profile details to Greenhouse/Lever application forms and strictly stopping before the submit barrier
  - **Tier 3 (AUTO_SUBMIT)**: Authorized API and email dispatch protected by candidate consent policies (`approve` barrier or `auto`)
- [x] Step-by-step autonomous pipeline runner (`services/agent-orchestration.service.ts`) executing the complete Section 10.3 lifecycle (preflight, job fetch, duplicate check, structured analysis, deterministic matching, threshold gating, grounded resume/cover-letter generation, application validation, tier branching, approval barriers, submission, and notifications)
- [x] Comprehensive preflight governance enforcing global emergency pause, monthly token budgets, and daily application limits before LLM invocation
- [x] Structured idempotency keys (`userId:jobIdentity:resumeVersion`) preventing duplicate network dispatches or double-applications
- [x] Automated 7-day follow-up reminder scheduling upon successful application submission
- [x] Deduplicated multi-channel notification dispatcher (`services/notification.service.ts`) with distinct event types and in-app/email dispatch
- [x] Instant user cancellation mechanism (`cancelAgentTask`) halting active pipelines and transitioning state to `CANCELLED`
- [x] Zero-resume-logging audit trail: `ApplicationEvent` and `AuditLog` record status transitions and metadata while strictly excluding raw candidate resume text
- [x] Agent execution and submission API routes (`GET /api/agent/tools`, `POST /api/agent/run`, `POST /api/agent/cancel`, `GET /api/agent/status`, `POST /api/applications/[id]/submit`)
- [x] Interactive "Apply with AI Agent" modal (`components/jobs/agent-run-dialog.tsx`) on Job Preview page (`/jobs/preview`) with live step-by-step progress monitor and cancel button
- [x] AI Agent Tools catalog and Execution History view added to `/settings/agent`
- [x] Tier-gated submission card added to Application Tracker detail dialog (`components/tracker/application-detail-dialog.tsx`)
- [x] Unit test suites for notification deduplication, tool registry execution, application submission gating, and agent orchestration pipeline (82 unit tests passed across 18 test files)
- [x] Playwright E2E test suites for AI Agent tools catalog, execution controls, and Apply with AI Agent dialog (15 E2E tests passed)

## Phase 9 — Interview coach

- [x] Grounded AI Interview Prep Pack generator (`services/interview-coach.service.ts`):
  - 5 structured question categories: `technical`, `behavioral`, `system_design`, `role_specific`, `culture`
  - STAR outlines mapped strictly to candidate's verified profile achievements (zero hallucinated metrics or employers)
  - Honest qualification bridging: identifies missing skills and provides truthful strategies to address gaps without falsifying experience
  - Role-specific study plans, curated high-signal questions for the interviewer, and day-of interview checklist
- [x] Text-Based Mock Interview Room (`/interviews/mock`):
  - Single-question interactive flow with role, type, and difficulty level configuration
  - Code question mode with in-browser editor and static AI code review (time/space complexity, edge cases, readability — zero server-side execution of untrusted user code)
  - Objective 5-pillar rubric evaluation: Technical Accuracy (25%), STAR Structure (20%), Tradeoff Depth (20%), Relevance (20%), Clarity (15%)
  - Immediate scorecard feedback with concrete strengths, weaknesses, weak topic tagging, and improved grounded sample answers
  - Session summary with aggregated rubric competency scores and targeted practice drill plans
- [x] History & Analytics Dashboard (`/interviews/history`):
  - High-level metric cards (total sessions, completed sessions, average score, score trend over time)
  - Rubric competency averages and weak topics aggregation
  - Candidate privacy controls: permanent one-click deletion of private mock transcripts and answers
- [x] Interview Calendar & Round Scheduler (`/interviews/calendar`):
  - Upcoming interview round agenda view with direct launch shortcuts to Prep Packs and Mock Interview Room
  - Schedule interview round dialog linked to tracked pipeline applications
- [x] Application Tracker Integration & Automated Hook:
  - `onApplicationMovedToInterview` automatically pre-generates prep packs and dispatches deduplicated `interview_scheduled` notifications when applications move to `INTERVIEW`
  - Direct Interview Coach launcher card added to Application Tracker detail dialog (`components/tracker/application-detail-dialog.tsx`)
- [x] Tool Registry Integration:
  - Connected Tools 17-20 (`generate_interview_prep`, `start_mock_interview`, `evaluate_answer`, `summarize_interview_session`) in `services/tool-registry.ts` directly to `interviewCoachService`
- [x] RESTful Interview API Endpoints (`/api/interviews/prep`, `/api/interviews/sessions`, `/api/interviews/sessions/[id]`, `/api/interviews/sessions/[id]/answer`, `/api/interviews/sessions/[id]/end`, `/api/interviews/calendar`)
- [x] Full Quality Gate Passed:
  - Unit test suite: 89 passed across 19 test files (`tests/unit/interview-coach.test.ts`)
  - Playwright E2E suite: 19 passed across all suites (`tests/e2e/interview-coach.spec.ts`)
  - ESLint (0 errors, 0 warnings) & TypeScript (0 errors)

## Phase 10 — Workers and notifications

- [x] BullMQ + Redis Queue System with Graceful Offline Degradation (`lib/queue/redis.ts`, `lib/queue/job-queue.ts`):
  - 4 specialized queues: `jobpilot-discovery`, `jobpilot-matching`, `jobpilot-notifications`, `jobpilot-maintenance`
  - Graceful degradation: when Redis is offline or unconfigured, background tasks are safely preserved in MongoDB (`AgentTask`) with status `pending`, ensuring zero application downtime
  - Exponential backoff retries (3 attempts), configurable concurrency limits, and dead-letter failure tracking
- [x] Dedicated Background Worker Service (`worker/index.ts`, `npm run worker`):
  - Multi-processor architecture:
    - Discovery processor (`worker/processors/discovery.processor.ts`): automated multi-provider job search
    - Matching processor (`worker/processors/matching.processor.ts`): deterministic qualification matching; triggers `high_match_found` when score exceeds user threshold
    - Notification processor (`worker/processors/notification.processor.ts`): transactional email dispatch, 7+ day follow-up scans (`follow_up_due`), 24h interview reminder scans (`interview_scheduled`), and 9:00 AM daily briefings (`daily_summary`)
    - Maintenance processor (`worker/processors/maintenance.processor.ts`): expires stale jobs older than 30 days and syncs provider connection health
  - 5 declared repeatable cron schedules (`worker/schedules.ts`)
  - Clean lifecycle management: graceful shutdown listeners (`SIGTERM`, `SIGINT`) and connection closing
- [x] Notification Center & Preference Management (`/notifications`):
  - In-app notification inbox with read/unread filtering, mark read, and clear controls
  - Delivery channel toggles: In-app alerts, transactional email via Resend, and daily digest briefings
  - Custom high-match alert score threshold (50% to 100%)
  - Granular event toggles for all 9 specification event types
- [x] Background Job Monitor & Queue Inspector (`/settings/jobs`):
  - Real-time Redis/Worker operational status badge with offline degradation warning
  - Queue metric counters (Waiting, Active Processing, Completed, Failed/DLQ, Pending in Database)
  - Scheduled repeatable cron tasks table with on-demand "Run Now" dispatch triggers
  - Live transactional email delivery tester (Resend REST API verification)
  - Persistent background task audit history table with instant task retry controls
- [x] RESTful Worker & Notification APIs:
  - `GET /api/worker/status`, `POST /api/worker/dispatch`, `GET /api/worker/jobs`, `POST /api/worker/jobs/[id]/retry`
  - `GET /api/notifications`, `PATCH /api/notifications`, `DELETE /api/notifications`, `GET/POST /api/notifications/preferences`, `POST /api/notifications/test-email`
- [x] Full Quality Gate Passed:
  - Unit test suite: 98 passed across 20 test files (`tests/unit/worker-queue.test.ts`)
  - Playwright E2E suite: 21 passed across all suites (`tests/e2e/worker-monitor.spec.ts`)
  - ESLint (0 errors, 0 warnings) & TypeScript (0 errors)

## Phase 11 — Analytics, settings, security hardening

- [x] Comprehensive Developer SaaS Dashboard (`app/(app)/dashboard/page.tsx`):
  - Replaces temporary placeholder with full command center
  - Live metric counters: Jobs Discovered, High-Match Roles (80%+), Applications Submitted, Awaiting Review, Upcoming Interviews, Average Mock Interview Score
  - Quick action shortcuts to Job Discovery, Application Pipeline Tracker, Mock Interview Room, and Background Job Monitor
  - Application Pipeline Funnel visualizer (Discovered -> Prepared -> Dispatched -> Interviewing -> Offers) with stage conversion percentages
  - Recent Pipeline Activity timeline feed showing real-time application events
- [x] Candidate Data Sovereignty & Portability (`services/data-management.service.ts`):
  - Portable JSON export across all 16 collections (`GET /api/user/export`) with sanitized credentials
  - Configurable historical data retention policy (`POST /api/user/retention`): 30, 60, 90, 180, 365 days or retain indefinitely, with one-click purge
  - Permanent cascading account erasure (`POST /api/user/delete-account`): completely wipes user record and all associated documents across all 16 collections with mandatory `"DELETE"` confirmation challenge and session cookie revocation
- [x] Security Hardening & Rate Limiting (`lib/rate-limiter.ts`):
  - Sliding window rate limiting protecting all sensitive operations
  - Category tiers: `auth` (10 req/min), `ai` (20 req/min), `export` (5 req/min), `standard` (60 req/min)
  - Compliant HTTP headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) and 429 response formatting
- [x] Zero-Resume-Logging Audit Log Service (`services/audit-log.service.ts`):
  - Structured immutable security audit trail (`GET /api/user/audit-logs`)
  - Strict privacy filter: automatic redaction of candidate passwords, API keys, and raw resume contents before persistence
- [x] Privacy, Security & Data Management Page (`app/(app)/settings/privacy/page.tsx`):
  - Zero-Resume-Logging Privacy Architecture guarantee card
  - One-click JSON data export trigger with progress indicator
  - Configurable data retention selector with manual purge execution
  - Danger Zone cascading account deletion with challenge modal
  - Live security audit log viewer
- [x] Full Quality Gate Passed:
  - Unit test suite: 104 passed across 21 test files (`tests/unit/data-management.test.ts`)
  - Playwright E2E suite: 23 passed across all suites (`tests/e2e/analytics-settings.spec.ts`)
  - ESLint (0 errors, 0 warnings) & TypeScript (0 errors)

## Phase 12 — Tests and deployment docs

- [x] Full Unit & Integration Test Suite (`tests/unit/`, `tests/integration/`):
  - 108 automated tests passing across 22 test files in Vitest
  - Comprehensive end-to-end multi-service integration tests (`tests/integration/candidate-workflow.test.ts`) covering profile verification, deterministic qualification matching, application state transitions, interview prep generation, rubric evaluations, rate limiting, and data sovereignty exports
- [x] Full Playwright End-to-End Suite (`tests/e2e/`):
  - 23 complete browser tests passing with zero failures
  - Covers candidate authentication, job discovery & import, tailored resume & cover letter generation, AI matching BYOK, AI agent orchestration & Apply modal, application tracker Kanban/Table views, interview coach prep packs/mock room/analytics/calendar, background job monitor & notifications, light/dark theme persistence, and candidate dashboard with privacy/data management
- [x] Comprehensive Documentation Suite:
  - `README.md`: completely modernized with architecture overview, feature breakdown, quickstart guide, test commands, and ethics statement
  - `docs/INTEGRATIONS.md`: exhaustive matrix of functional integrations, operational tiers (Manual vs Prefill-Assisted vs Auto-Submit), and strict anti-bot boundaries
  - `docs/SECURITY.md`: complete security and privacy specifications (Zero-Resume-Logging guarantee, BYOK AES-256-GCM encryption, rate limiting, prompt-injection defense, and data sovereignty)
  - `docs/DEPLOYMENT.md`: production deployment guide covering Vercel App Router, standalone BullMQ worker container, MongoDB Atlas, managed Redis, Resend email DNS verification, environment variable checklist, and health checks
  - `docs/DECISIONS.md`: architectural decision record updated through Phase 12
- [x] Full Quality Gate Passed:
  - ESLint: 0 errors, 0 warnings (`npm run lint`)
  - TypeScript: 0 errors (`npm run typecheck`)
  - Vitest: 108/108 passed (`npm test`)
  - Playwright: 23/23 passed (`npm run test:e2e`)
