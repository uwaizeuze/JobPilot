# JobPilot 🎯

**Autonomous AI Job Discovery & Application Command Center**

JobPilot is an enterprise-grade, developer-focused SaaS platform engineered to automate the job search lifecycle with rigorous honesty, zero-resume-logging candidate privacy, grounded AI assistance, and transparent platform integrations.

Built strictly according to [`AI_JOB_HUNTER_MASTER_PROMPT.md`](./AI_JOB_HUNTER_MASTER_PROMPT.md).

---

## 🌟 Key Capabilities

- **Command Center & Pipeline Funnel**: Real-time metrics tracking discovered jobs, high-match roles (80%+), applications submitted, awaiting reviews, upcoming rounds, and mock interview trends, with a 5-stage conversion funnel.
- **Multi-Source Job Discovery**: Ingest and normalize listings from Greenhouse, Lever, LinkedIn, Indeed, and Naukri via manual paste or structured imports, with honest capability indicators and zero fake mock listings.
- **Deterministic AI Qualification Matching**: Weighted multi-factor matching algorithms (skills, experience, location, role seniority, education) with component score breakdowns and missing-skill gap roadmaps.
- **Grounded Resume Tailoring & Export**: Semantic keyword alignment strictly preserving verified candidate history (zero hallucinated employers or metrics) with pixel-perfect PDF and DOCX document generation.
- **Autonomous Multi-Tier Application Engine**:
  - **Tier 1 (Manual)**: Portal redirection for LinkedIn, Indeed, and Naukri without scraping or automated bot evasion.
  - **Tier 2 (Prefill-Assisted)**: Playwright-powered form pre-population for Greenhouse and Lever stopping strictly before submission.
  - **Tier 3 (Direct Auto-Submit)**: Transactional email and authorized partner REST API submission governed by candidate consent policies (`approve` barrier or `auto`).
- **AI Interview Coach & Mock Practice Room**:
  - Grounded prep packs with 5 question categories (`technical`, `behavioral`, `system_design`, `role_specific`, `culture`).
  - STAR outlines built strictly from verified candidate achievements.
  - In-browser code review (static AI time/space complexity analysis; zero server-side untrusted code execution).
  - Objective 5-pillar rubric evaluations with private, one-click deletable transcripts.
- **Resilient Distributed Background Workers**:
  - **BullMQ + Redis** queues for discovery, matching, notifications, and maintenance.
  - **Zero-Downtime Offline Degradation**: When Redis is offline, tasks are safely queued in MongoDB (`AgentTask`) with status `pending`.
- **Security Hardening & Data Sovereignty**:
  - **AES-256-GCM** encryption for candidate BYOK OpenAI keys.
  - **Zero-Resume-Logging** audit trail with automatic redaction of passwords, API keys, and candidate resume texts.
  - **Sliding Window Rate Limiting** with category quotas (`auth`, `ai`, `export`, `standard`) and standard `X-RateLimit-*` headers.
  - **Data Sovereignty**: One-click portable JSON export across all 16 collections, configurable retention policies, and cascading permanent account erasure.

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS & Lucide Icons (Radix UI primitives)
- **Database**: MongoDB with Mongoose ODM (16 isolated schemas)
- **Queue / Worker**: BullMQ & ioredis (with standalone worker executable via `npm run worker`)
- **Document Generation**: `pdfkit`, `docx`, `mammoth`, `pdf-parse`
- **Testing**: Vitest (Unit & Integration) & Playwright (End-to-End browser tests)

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js**: v20+ (developed on Node 24)
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/jobpilot`) or MongoDB Atlas URI
- **Redis** *(Optional)*: Local Redis instance (`redis://127.0.0.1:6379`) or Upstash Redis URL (platform degrades gracefully without Redis)

### 2. Installation
```bash
git clone https://github.com/your-username/jobpilot.git
cd jobpilot
npm install
```

### 3. Environment Setup
Copy the example environment template:
```bash
cp .env.example .env.local
```

Fill in the required secret keys:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/jobpilot
AUTH_SECRET=jobpilot-development-auth-secret-do-not-use-in-production-32chars
KEY_ENCRYPTION_SECRET=jobpilot-key-encryption-secret-32chars-min!
APP_BASE_URL=http://localhost:3000

# Optional Server Integrations
REDIS_URL=redis://127.0.0.1:6379
OPENAI_API_KEY=sk-proj-...
RESEND_API_KEY=re_...
EMAIL_FROM=JobPilot <notifications@yourdomain.com>
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running the Background Worker Process
In a separate terminal:
```bash
npm run worker
```

---

## 🧪 Comprehensive Test Suites

JobPilot maintains a strict Quality Gate:

```bash
# 1. Linting & Typecheck (0 errors, 0 warnings)
npm run lint
npm run typecheck

# 2. Vitest Unit & Integration Tests (108 tests across 22 test files)
npm test

# 3. Playwright End-to-End Suite (23 browser tests)
npm run test:e2e
```

---

## 📚 Complete Documentation

- [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md): Transparent matrix of functional third-party integrations, operational tiers, and anti-bot boundaries.
- [`docs/SECURITY.md`](./docs/SECURITY.md): Threat model, BYOK AES-256-GCM encryption, rate limiting, and Zero-Resume-Logging architecture.
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md): Step-by-step production deployment guide for Vercel, standalone BullMQ workers, MongoDB Atlas, and managed Redis.
- [`docs/IMPLEMENTATION_CHECKLIST.md`](./docs/IMPLEMENTATION_CHECKLIST.md): Phase-by-phase implementation verification record.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md): Architectural decisions and evolution history across all 12 implementation phases.

---

## ⚖️ Ethics & Privacy Statement

JobPilot operates under strict candidate-first ethics:
- We never simulate production integrations with fake data.
- We never attempt unauthorized bot evasion or violate third-party Terms of Service.
- We never log raw candidate resumes or private document contents.
- Candidates retain 100% control over their data, credentials, and application submissions at all times.
