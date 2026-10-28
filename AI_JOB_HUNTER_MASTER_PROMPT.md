PROJECT: AI JOB HUNTER — AUTONOMOUS JOB DISCOVERY AND APPLICATION ASSISTANT
Works with Cursor, Claude Code, Codex, and Antigravity. Paste the whole file as the first message, or save it as AGENTS.md / CLAUDE.md / .cursorrules in the repo root and say: "Read the prompt file and begin with the FIRST ACTION."

0. HOW TO WORK (READ FIRST)
Act as a principal software architect, senior full-stack developer, AI agent engineer, automation engineer, security engineer, and UI/UX designer with 10+ years of experience shipping production SaaS.
Rules of engagement:
Inspect the repository before changing anything. Preserve working functionality and follow existing conventions. If the repo is empty, create the structure in this prompt.
Work in the phases of Section 21. Finish, test, and document one phase before starting the next.
Never dump the whole project in one pass. Small, tested, reviewable steps.
Maintain docs/IMPLEMENTATION_CHECKLIST.md. Mark an item done only when it works and is tested, not when its UI exists.
Never claim an integration works until it is implemented and tested. Never fake integrations or return hardcoded jobs as if real.
If something is ambiguous, state your assumption in one line and proceed. Ask only when truly blocked.
Before installing dependencies, inspect the existing environment and choose compatible, maintained versions.
Keep a docs/DECISIONS.md log of architectural decisions and known limitations.

1. PRODUCT VISION
Build a personal AI agent that manages a developer's full job-search workflow. It must:
Maintain the user's professional profile.
Discover relevant jobs from permitted sources.
Analyze job descriptions with AI.
Match jobs against the user's verified qualifications.
Rank jobs by relevance.
Generate job-specific resume drafts.
Generate personalized cover letters.
Detect duplicate listings and previous applications.
Prepare application information.
Submit applications automatically ONLY through integrations that explicitly permit it and the user has authorized.
Prepare assisted applications when automated submission is unavailable or prohibited.
Track application progress.
Notify the user about important events.
Run scheduled background tasks.
Provide analytics.
Prepare the user for interviews with AI prep packs and mock interviews.
Support both automatic and user-controlled workflows. Never assume a platform has an unrestricted public API.
Do NOT bypass CAPTCHA, authentication, MFA, rate limits, access controls, or platform restrictions. No unauthorized scraping, stolen cookies, or bot-detection evasion.
Do not build only a landing page or mockup. Build a functional app: real database, auth, AI integration, discovery, matching, resume generation, application preparation, authorized submission, workers, notifications, and tracking.

2. TECHNOLOGY STACK
Frontend: Next.js (App Router), React, TypeScript (strict), Tailwind CSS, shadcn/ui, Framer Motion, Lucide React. State: Zustand (UI state), TanStack Query (server state). Backend: Next.js Route Handlers, server-side service layer, Zod validation, REST-style APIs. Database: MongoDB + Mongoose, indexes, schema validation. AI: OpenAI API, structured outputs for extraction/classification, tool calling for controlled agent actions, configurable provider abstraction. Background: Redis, BullMQ, dedicated worker, scheduled discovery, retries, dead-letter handling. Auth: Auth.js (or another maintained solution). Files: PDF text extraction, DOCX parsing, PDF and DOCX export. Notifications: Resend or configurable email provider. Testing: Vitest, React Testing Library, Playwright (for the app's own E2E). Deployment: Vercel (frontend + suitable endpoints), separate persistent worker service, managed MongoDB, managed Redis.
Suggested structure (adapt to the repo):
/app            Next.js routes and API handlers/components     UI components/lib            config, db, auth, ai, queue, utils/services       the 10 domain services (Section 9)/providers      job-source, browser, ai, email adapters/models         Mongoose models/worker         BullMQ worker entrypoint, processors, schedules/tests          unit, integration, e2e, fixtures/docs           checklist, decisions, deployment, security

3. PROFESSIONAL USER PROFILE
Fields: full name, email, phone, current location, preferred locations, remote/hybrid/onsite preference, headline, summary, total experience, current employer, employment history (titles, responsibilities, achievements), technical skills, education, certifications, projects, portfolio/GitHub/LinkedIn URLs, expected salary, current salary (optional), notice period, availability, work authorization (where relevant), preferred industries, employment type, preferred seniority.
Requirements:
Everything editable by the user.
Profile-completeness indicator.
Upload an existing resume (PDF or DOCX); extract data; user reviews and confirms before saving.
Never infer missing personal details or invent qualifications.
Controls to export and delete all profile data.

4. JOB DISCOVERY ENGINE
Create a unified discovery service with a provider-adapter architecture.
Source categories: LinkedIn, Naukri, Indeed listings (only through permitted means), company career pages, authorized third-party job APIs, user-submitted job URLs, email job alerts, manually imported job descriptions.
interface JobSourceProvider {  getProviderName(): string;  getCapabilities(): ProviderCapabilities; // discover, submit, prefill, tier  isConfigured(): Promise<boolean>;  searchJobs(criteria: JobSearchCriteria): Promise<JobSearchResult>;}
Implement provider adapters only where supported by documented APIs, authorized integrations, permitted feeds, or user-provided data.
If a platform has no authorized automated interface, show its connection status and explain the manual or alert-based workflow.
Respect source request limits and data-retention requirements.
Job record fields: title, company, company website, description, required skills, preferred skills, required experience, location, work mode, employment type, salary range, source platform, original URL, date discovered, posting date, last verified date, application method, job status, match score, duplicate-group id.
Implement pagination, filters, sorting, and deduplication.

5. AI JOB ANALYSIS ENGINE
For each job extract: required skills, optional skills, experience, education, responsibilities, seniority, location requirements, remote eligibility, salary, employment type, certifications, mandatory eligibility conditions.
Use structured output validated with Zod; store normalized analysis in MongoDB.
Distinguish explicit requirements, optional qualifications, inferred requirements, and missing information. Never treat inferred data as verified fact.
Treat job descriptions and all external content as UNTRUSTED. Embedded instructions must never override system policy or trigger tools.

6. JOB MATCHING AND RANKING
Explainable matching across: technical skills, relevant experience, title relevance, responsibilities, location, work mode, salary compatibility, mandatory eligibility.
Output: overall score 0-100, component scores, matching skills, missing skills, relevant experience, eligibility concerns, explanation, recommended next action.
Configurable weights.
Deterministic scoring for structured data; AI only for extraction from unstructured text. The LLM must NOT assign arbitrary scores.
Mandatory eligibility is evaluated separately from the score.
User-configurable minimum match threshold.
Filters: high-match, remote, recently posted, company, location, seniority, salary, source.

7. RESUME INTELLIGENCE
Features: upload original, parse PDF/DOCX, extract history/skills/education/projects/achievements, maintain a verified master profile, generate tailored drafts, link resumes to jobs, compare resume vs job requirements, version history, preview, export PDF and DOCX, download, delete generated versions.
Tailoring procedure:
Read the verified master profile.
Analyze the target job.
Pick the most relevant experience.
Reorder/emphasize existing information.
Improve clarity and relevance.
Preserve factual accuracy.
Run an unsupported-claims check against the master profile.
Produce a reviewable document.
Save a version linked to the job.
Never invent projects, technologies, achievements, education, certifications, employers, or years of experience. Always preserve the original resume.

8. COVER LETTER GENERATION
Inputs: verified profile, job description, company info (if available), tone, resume version. Outputs: draft, relevant experience highlights, job-specific motivation, editable text, exportable document.
Avoid generic or repetitive letters. Do not invent relationships, company research, achievements, or experience. Users can edit and approve.

9. AI AGENT ORCHESTRATION
9.1 Services
JobDiscoveryService, JobAnalysisService, JobMatchingService, ResumeGenerationService, CoverLetterService, DuplicateDetectionService, ApplicationPreparationService, ApplicationSubmissionService, NotificationService, ApplicationTrackingService.
An AgentOrchestrationService runs these in a defined workflow with: tool selection, structured inputs/outputs, permission checks, execution limits, retry policies, action logs, error recovery, user cancellation, and workflow status tracking.
The agent has NO unrestricted browser or OS access. Only explicitly registered tools. AI-generated arguments must never bypass server-side authorization. Use deterministic code for critical operations and AI for language understanding and decision support. Implement idempotency everywhere that matters.
9.2 AI key setup (bring-your-own-key)
Settings > AI Agent: the user pastes their own OpenAI API key.
The server validates it with a cheap test call, then stores it encrypted (AES-256-GCM, master key from KEY_ENCRYPTION_SECRET). Never return it to the client; show only the last 4 characters.
Per-user limits: monthly token budget, max applications per day, allowed models. The agent stops when a limit is hit.
Provider abstraction: AIProvider { generateStructured(), callWithTools() }. With no key, return a clear "AI not configured" error.
Keys never appear in logs, client bundles, or error messages.
9.3 Registered tools
Each tool has a Zod input/output schema, a server-side ownership check, an idempotency key, and a timeout. Model-supplied arguments can NEVER override userId, providerId, or permissions.
#
Tool
Purpose
1
discover_jobs
Run permitted discovery for saved criteria
2
fetch_job
Load a job record
3
analyze_job
Structured AI analysis
4
calculate_match
Deterministic scoring
5
check_duplicate
Duplicate jobs and applications
6
verify_job_open
Confirm the posting is still available
7
generate_resume
Tailored resume from master profile
8
generate_cover_letter
Tailored cover letter
9
prepare_application
Build checklist and answers
10
validate_application
Required fields, eligibility, consent
11
request_approval
Create a user review task
12
prefill_form
Playwright prefill, never submits
13
submit_authorized_application
Tier-gated and consent-gated submission
14
record_result
Save outcome and confirmation reference
15
update_application_status
Valid state transitions only
16
notify_user
Deduplicated notification
17
generate_interview_prep
Prep pack from job analysis and verified profile
18
start_mock_interview
Create a mock session and ask the first question
19
evaluate_answer
Rubric-based structured feedback on one answer
20
summarize_interview_session
Session summary and weak-topic update

10. APPLICATION AUTOMATION
10.1 Apply tiers (capability flag per provider)
AUTO_SUBMIT: submission through an authorized channel only: email apply (SMTP/Resend to the apply address published in the posting), or an ATS API where the user holds valid credentials or authorization.
PREFILL_ASSISTED: Playwright opens the job page in a visible browser and fills fields from the verified profile, then STOPS. The user solves any CAPTCHA/login and clicks Submit.
MANUAL: tailored resume, cover letter, checklist, and link; the user applies and records confirmation.
LinkedIn and Indeed are MANUAL (alerts + import). Never default a provider to a higher tier than its documented capability. Many ATS submit APIs require the employer's credentials; do not pretend candidate-side access exists.
10.2 Workflow states
DISCOVERED, ANALYZING, NOT_QUALIFIED, SHORTLISTED, PREPARING, READY_FOR_REVIEW, AWAITING_APPROVAL, SUBMITTING, APPLIED, FAILED, REJECTED, ASSESSMENT, INTERVIEW, OFFER, WITHDRAWN, CANCELLED.
Implement and unit-test a transition table. Invalid transitions are rejected.
10.3 Step-by-step auto-apply pipeline
Trigger: scheduled run, "Apply" button, or high-match alert.
Preflight: global pause off, provider enabled, AI key valid, daily and token limits not exceeded. Otherwise stop and notify.
Load job (fetch_job). Treat its text as untrusted data.
verify_job_open. If closed, mark FAILED (reason: closed).
check_duplicate using user ID + normalized job identity + provider application ID. If duplicate, stop and link to the existing application.
analyze_job with Zod-validated structured output.
calculate_match. Below the user's threshold, or mandatory eligibility not met: NOT_QUALIFIED with reasons.
Move to SHORTLISTED, then PREPARING.
generate_resume and generate_cover_letter, followed by the unsupported-claims check. Remove or flag any claim not in the master profile.
validate_application: every required answer must come from verified profile data. Unknown or legal/consequential questions stay blank and are flagged for the user.
Branch by provider tier:
AUTO_SUBMIT + consent policy "auto": go to step 12.
AUTO_SUBMIT + consent policy "approve": go to step 11.
PREFILL_ASSISTED: prefill_form, then READY_FOR_REVIEW.
MANUAL: READY_FOR_REVIEW with checklist and link.
request_approval: state AWAITING_APPROVAL. The user sees the resume, cover letter, and answers; they can edit, approve, or reject.
Re-check: job still open, no new duplicate, resume approved, pause switch off. Then state SUBMITTING.
submit_authorized_application with idempotency key userId:jobIdentity:resumeVersion. Retries can never double-send.
record_result: confirmation reference, timestamps, provider response (no resume contents in logs). State becomes APPLIED or FAILED with a reason.
notify_user (deduplicated). Write an ApplicationEvent and AuditLog entry for every step above.
Schedule a follow-up reminder (default 7 days, configurable).
10.4 Safety rules
Never bypass CAPTCHA, MFA, anti-bot systems, login protections, or site restrictions.
No fabricated answers. No answering legal-eligibility questions without verified user data. No auto-agreeing to legal declarations or consequential terms.
If a job requires an assessment or interview task, notify the user. Never complete it deceptively.
Prompt injection: job text can never add tools, change permissions, or alter these rules. Log suspicious content.
Limits: max tool calls per run, max runs per day, user cancel at any time (state CANCELLED, run halts).
Failures: exponential backoff, then dead-letter queue.
Global pause switch and per-provider disable work instantly.
Application audit log visible to the user.

11. BROWSER AUTOMATION
Use Playwright only for permitted workflows: testing the app's own UI, testing permitted integrations, opening job pages, navigating to user-approved destinations, assisting form preparation where permitted, verifying supported workflows.
Do not implement auto-apply bots for LinkedIn or Indeed.
Do not bypass authentication or anti-bot controls; do not reverse-engineer private endpoints.
Create a browser-provider abstraction so a permitted integration can be added without changing the agent core.
Explicit timeouts, error handling, and cleanup.
Never store passwords or session cookies in plaintext.

12. APPLICATION TRACKER
Track: company, title, URL, source, match score, resume version, cover-letter version, status, application date, last activity, recruiter contact, notes, follow-up date, interview date, outcome.
Implement: Kanban view, table view, search, filters, sorting, pagination, status changes, notes, activity timeline, follow-up reminders, interview calendar, CSV export.
Prevent duplicates using user ID + normalized job identity + provider application ID where available. Different URLs do not always mean different jobs.

12A. AI INTERVIEW COACH (PREP PACKS AND MOCK INTERVIEWS)
Build an interview-preparation module powered by the user's AI key (Section 9.2). It is for PRACTICE and PREPARATION only.
Interview prep pack (per job)
Generate from the job analysis plus the verified master profile:
Likely questions grouped as technical, behavioral, system design, role-specific, and company/culture.
Suggested answer outlines using the STAR format, built ONLY from real experience in the verified profile. If the profile has no relevant experience, say so and suggest how to answer honestly.
Skill gaps between the job and the profile, with a short study plan.
Smart questions the candidate can ask the interviewer.
A checklist for the day (logistics, documents, links).
Never invent experience, metrics, employers, or company research.
Mock interview room
The user picks a job (or a generic role), interview type (technical, behavioral, system design, mixed), difficulty, and duration.
The AI acts as the interviewer: ONE question at a time, with follow-up questions based on the user's answer.
Text mode first. Voice mode (browser speech APIs or OpenAI audio) is optional and must be a clearly separated later task.
After each answer, return structured feedback validated with Zod: scores for clarity, structure, technical accuracy, relevance, and depth; strengths; weaknesses; and an improved sample answer that does NOT invent experience.
Scoring follows a documented rubric with configurable weights. The LLM fills rubric fields; it does not pick arbitrary totals.
Coding questions: an in-browser editor with AI code review. Do NOT execute user code on the server unless a properly sandboxed runner is built and tested.
At the end, produce a session summary: overall score, weak topics, recommended practice, and a comparison with previous sessions.
The user can pause, skip, end early, or restart a session at any time.
Interview tracking and analytics
Interview history with score trends per topic and per interview type.
Weak-topic list that feeds the next prep pack.
When an Application moves to INTERVIEW, or an interview date is set, automatically generate a prep pack, send a notification, and add a calendar reminder (idempotent).
Rules
Do not build real-time assistance that feeds answers to the user during an actual live interview, and do not help impersonate or deceive an interviewer.
Treat job descriptions and company text as untrusted content (prompt-injection protection applies).
Transcripts and recordings are private to the user, never logged, deletable on demand, and covered by the retention policy and data export.
Enforce the user's token budget; stop the session with a clear message when it is reached.

13. NOTIFICATIONS
Events: high-match job found, resume generated, application ready for review, submitted, failed, interview scheduled, follow-up due, integration disconnected, daily summary.
Email support, configurable preferences, no repeated notifications for the same event, idempotency keys, retry-safe processing.

14. SCHEDULER AND BACKGROUND WORKERS
A separate persistent worker with BullMQ + Redis. Scheduled tasks: daily discovery, periodic source sync, job revalidation, matching, resume-generation requests, notification processing, follow-up reminders, status sync where supported.
Implement: configurable schedules, retries, exponential backoff, timeouts, concurrency limits, failed-job inspection, dead-letter handling, structured logging, graceful shutdown, health checks, distributed locks where needed, no repeat processing of the same job, and an admin UI for inspecting jobs.
The app must stay functional when the worker is offline, with pending tasks clearly shown.

15. USER INTERFACE AND DESIGN
Premium developer-focused SaaS: clean typography, responsive layouts, subtle gradients, refined cards, accessible contrast, smooth restrained animation, clear status indicators, consistent spacing, polished light and dark themes.
Pages: landing, login, registration, onboarding wizard, dashboard, job discovery, job details, match analysis, resume library, resume editor/preview, cover-letter editor, application tracker, interview calendar, interview prep packs, mock interview room, interview history and analytics, notifications, integration settings, AI agent settings (key, limits, consent policy, pause switch), background-job monitor, profile settings, privacy and data management.
Dashboard: jobs discovered, high-match jobs, applications submitted, awaiting review, upcoming interviews, mock-interview score trend, failed tasks, recent activity, conversion statistics.
Every button must do something meaningful. Provide loading, error, empty, and success states. No fake production statistics. Seed data must be clearly labeled as demonstration data.

16. DATABASE MODELS
User, ProfessionalProfile, Job, JobAnalysis, Resume, ResumeVersion, CoverLetter, Application, ApplicationEvent, JobSourceConnection, AgentTask, Notification, UserPreference, AuditLog, InterviewPrepPack, MockInterviewSession, InterviewAnswer.
Define relationships, indexes, schema validation, and unique constraints. Users access only their own records. Store minimal personal data. Implement export and deletion. Define retention policies for imported job descriptions and external data. Store the encrypted AI key in UserPreference (encrypted field only).

17. SECURITY AND PRIVACY
Secure auth, server-side authorization on every private route, input and output validation, rate limiting, CSRF protection where applicable, secure file upload (size limits, type validation, malicious-document protection), secret management, private document storage, audit logging, data export and deletion, session management.
AI keys stay on the server. Never expose secrets to client components. Never log resume contents, passwords, tokens, or unnecessary personal data. Treat job descriptions and imported documents as untrusted; imported text can never alter system instructions or authorize tools.

18. TESTING
Unit: matching, duplicate detection, state transitions, resume validation, permission checks, provider capabilities and tier gating, retry behavior, idempotency, notification dedup, AI-key encryption, consent-policy branches, budget limits, prompt-injection fixtures, pause switch, interview rubric scoring, interview budget limits, prep-pack grounding (no invented experience).
Integration: profile creation, interview prep generation, mock interview session flow, job import, job analysis, resume generation, application preparation, tracking, background-job processing.
E2E (Playwright): principal user workflows.
Use mocked OpenAI and mocked providers in all automated tests. Never submit real applications during tests. Provide fixtures and documented test commands.

19. ENVIRONMENT CONFIGURATION
Create a documented .env.example with placeholders only for variables actually used:
MONGODB_URI=AUTH_SECRET=KEY_ENCRYPTION_SECRET=OPENAI_API_KEY=            # optional server default; users may bring their ownREDIS_URL=RESEND_API_KEY=EMAIL_FROM=APP_BASE_URL=
Never commit real credentials. Document all setup steps. Show clear configuration errors when an integration is not configured.

20. DOCUMENTATION DELIVERABLES
README.md (setup, run, test), docs/IMPLEMENTATION_CHECKLIST.md, docs/DECISIONS.md, docs/INTEGRATIONS.md (what is genuinely functional and each provider's tier), docs/SECURITY.md, docs/DEPLOYMENT.md (Vercel + worker + managed MongoDB/Redis).

21. IMPLEMENTATION PHASES
Repository inspection, architecture, project setup, UI foundation.
Authentication, user profiles, secure database models.
Resume upload, parsing, profile extraction, verification.
Job discovery interfaces, manual import, provider adapters.
AI key setup, AI job analysis, structured extraction, matching, ranking.
Resume generation, cover letters, editing, document export.
Application tracker, duplicate detection, application preparation.
Tool registry, agent orchestration, auto-apply pipeline (Section 10.3), authorized submission integrations, assisted-application workflows.
AI Interview Coach: prep packs, mock interview room (text), rubric feedback, interview history and analytics (Section 12A).
BullMQ workers, scheduled discovery, retries, notifications, interview reminders.
Analytics, settings, security hardening, data management.
Unit, integration, and E2E tests; deployment documentation.
At the end of every phase:
Summarize the implemented functionality.
List files created or modified.
Run the appropriate tests.
Fix errors before proceeding.
Document remaining limitations.
State which integrations are genuinely functional.
Update the checklist.

22. DEFINITION OF DONE
Ready for initial production evaluation only when:
Authentication works and profiles persist in MongoDB.
Resume upload and parsing work; users can review extracted data.
Job import works; integrations accurately report capabilities.
AI analysis returns validated structured data; match scores follow documented rules.
Resume drafts and cover letters can be generated, edited, and exported.
Duplicate applications are detected; state transitions are enforced.
The AI key is stored encrypted and limits are enforced.
Automated submission is restricted to authorized integrations and consent policy.
Assisted applications work for unsupported platforms.
Interview prep packs and mock interviews work, with rubric-based feedback and private, deletable transcripts.
Background jobs can be inspected and retried; notifications work.
User data is isolated; secrets are protected.
Tests pass; deployment instructions are complete.
A missing third-party integration must be reported honestly and never simulated with fake production data.

23. FIRST ACTION
Inspect the repository (or confirm it is empty).
Produce a concise implementation plan and name the first deliverable.
Create docs/IMPLEMENTATION_CHECKLIST.md.
Implement Phase 1 immediately.
Prioritize a working end-to-end workflow over unnecessary architectural complexity. The final product should be a secure, maintainable AI job-search and application platform that can grow as more authorized integrations become available.

