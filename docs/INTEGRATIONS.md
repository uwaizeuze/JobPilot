# JobPilot Integrations Guide

This document provides a transparent, honest account of every third-party integration supported by JobPilot, its operational tier, and its architectural boundaries. In strict adherence to our core principles, **JobPilot never simulates production connectivity with fake data, never attempts illegal bot evasion, and never violates platform terms of service**.

---

## 1. Integration Tiers Overview

JobPilot categorizes job application submission channels into three distinct tiers:

| Tier | Name | Target Platforms | Automation Mechanism | Human Oversight |
|---|---|---|---|---|
| **Tier 1** | **Manual Review** | LinkedIn, Indeed, Naukri, Glassdoor | Tailored resume/cover letter generation + one-click portal launch | 100% human-submitted; zero automated form submission |
| **Tier 2** | **Prefill-Assisted** | Greenhouse, Lever, Workday | Playwright-powered form pre-population | Candidate performs final review & manually clicks Submit |
| **Tier 3** | **Direct Auto-Submit** | Authorized Partner APIs & Direct Email | Direct HTTP API requests or signed transactional email | Automatic submission subject to candidate pre-approval policies |

---

## 2. Detailed Platform Capabilities

### LinkedIn, Indeed, Naukri (Tier 1 — Manual)
- **Status**: **Genuinely Functional in Manual Mode**
- **Capabilities**:
  - Structured job description parsing via manual URL/text paste.
  - Deterministic qualification matching against candidate verified profile.
  - Grounded, tailored PDF/DOCX resume generation and targeted cover letters.
  - Direct portal redirect link with clipboard-ready answers.
- **Boundaries & Anti-Bot Policy**:
  - JobPilot **strictly refuses** automated browser bot submissions, CAPTCHA bypasses, or proxy rotation against LinkedIn, Indeed, or Naukri.
  - These platforms actively enforce automated access restrictions. JobPilot respects these terms by empowering the candidate with personalized application assets while leaving the final dispatch to human review.

### Greenhouse & Lever (Tier 2 — Prefill-Assisted)
- **Status**: **Genuinely Functional with Assisted Automation**
- **Capabilities**:
  - Automated field mapping from candidate profile: full name, email, phone, location, LinkedIn URL, GitHub profile, and portfolio.
  - Auto-attachment of tailored resume (`.pdf` / `.docx`) and cover letter.
  - Browser pre-population via Playwright automation service (`services/browser-automation.service.ts`).
- **Boundaries**:
  - The automation pipeline strictly halts before the final submit button. The candidate inspects the populated fields in the browser session and executes the submission manually.

### Direct Email & Authorized APIs (Tier 3 — Auto-Submit)
- **Status**: **Genuinely Functional with Consent Gating**
- **Capabilities**:
  - Automated email application dispatch via Resend REST API.
  - Generates professional outbound email with candidate contact details, tailored cover letter body, and attached resume.
  - Authorized partner ATS webhook/REST dispatches.
- **Consent Governance**:
  - Enforces candidate consent policy configured in AI Agent settings:
    - `approve`: Requires explicit user confirmation in Application Tracker before dispatching.
    - `auto`: Automatically dispatches only when qualification match score meets or exceeds candidate's minimum threshold (e.g., 85%+).

---

## 3. Core Service Integrations

### OpenAI & AI Model Providers
- **Status**: **Genuinely Functional (Bring-Your-Own-Key & Default Server Key)**
- **Supported Models**: `gpt-4o`, `gpt-4o-mini`
- **Capabilities**:
  - Structured extraction of unstructured job descriptions (`jobAnalysisService`).
  - Tailored resume bullet revision with honest metrics (`resumeTailoringService`).
  - Grounded cover letter drafting in 4 distinct tones (`coverLetterService`).
  - STAR story extraction and 5-pillar rubric feedback (`interviewCoachService`).
- **Security & BYOK**:
  - Candidates can provide their own OpenAI API key in `/settings/ai-agent`.
  - Keys are encrypted with **AES-256-GCM** using `KEY_ENCRYPTION_SECRET` and stored exclusively in the database.
  - API keys are never returned to client-side code, never included in export bundles, and never logged.

### Redis & BullMQ Background Queue
- **Status**: **Genuinely Functional with Graceful Offline Degradation**
- **Queues**:
  - `jobpilot-discovery`: Multi-source background job search.
  - `jobpilot-matching`: Qualification match score calculation.
  - `jobpilot-notifications`: Transactional email and scheduled alert dispatch.
  - `jobpilot-maintenance`: Stale job archiving and provider connection checks.
- **Offline Fallback**:
  - If Redis is offline, unconfigured, or unreachable, background tasks are preserved directly in MongoDB (`AgentTask`) with status `pending`.
  - Zero application downtime occurs; tasks can be inspected and retried from `/settings/jobs`.

### Resend (Transactional Email)
- **Status**: **Genuinely Functional**
- **Capabilities**:
  - Outbound email alerts for high-match jobs, interview reminders, and daily digest briefings.
  - Built-in credentials tester in `/settings/jobs` to verify API key validity and domain verification status.

---

## 4. Honest Capability Matrix

| Provider / Service | Protocol | Production Mode | Local Fallback Mode | Real Credentials Required |
|---|---|---|---|---|
| **LinkedIn** | Web Portal | Manual Review | Manual Review | No (Candidate's browser) |
| **Indeed** | Web Portal | Manual Review | Manual Review | No (Candidate's browser) |
| **Naukri** | Web Portal | Manual Review | Manual Review | No (Candidate's browser) |
| **Greenhouse** | Web Form / API | Assisted Prefill | Manual Review | Optional ATS Key |
| **Lever** | Web Form / API | Assisted Prefill | Manual Review | Optional ATS Key |
| **OpenAI** | REST HTTPS | BYOK / Server Key | Deterministic Rubrics | Optional (Graceful fallback) |
| **BullMQ / Redis** | TCP / RESP | Distributed Queue | MongoDB Queue | Optional (Runs offline) |
| **Resend** | REST HTTPS | Live Transactional Email | In-App Notifications | Optional (`RESEND_API_KEY`) |
| **MongoDB** | Wire Protocol | Replica Set Atlas | Local MongoDB Instance | Yes (`MONGODB_URI`) |
