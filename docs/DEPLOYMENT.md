# JobPilot Production Deployment Guide

This guide describes how to deploy JobPilot to production using **Vercel** for the Next.js 16 web application, a container runtime for the **standalone BullMQ background worker**, and managed services for **MongoDB** and **Redis**.

---

## 1. System Architecture Overview

```
                      +-----------------------------+
                      |      Candidate Browser      |
                      +--------------+--------------+
                                     |
                                     v HTTPS
                      +-----------------------------+
                      |     Vercel Edge / Server    |
                      |   (Next.js 16 App Router)   |
                      +-------+--------------+------+
                              |              |
                MongoDB Wire  |              | Redis RESP
                              v              v
        +-----------------------------+   +-----------------------------+
        |     MongoDB Atlas Cluster   |   |     Managed Redis Instance  |
        |   (16 Isolated Collections) |   |    (Upstash / Redis Cloud)  |
        +-----------------------------+   +--------------+--------------+
                              ^                          ^
                              |                          |
                MongoDB Wire  |                          | Redis RESP
                              +--------------+-----------+
                                             |
                              +--------------+--------------+
                              |   Standalone BullMQ Worker  |
                              |  (Docker / Railway / Render)|
                              |      `npm run worker`       |
                              +--------------+--------------+
                                             |
                                             v HTTPS
                              +-----------------------------+
                              |         Resend API          |
                              |    (Transactional Email)    |
                              +-----------------------------+
```

---

## 2. Environment Variables Checklist

Before deploying, prepare the following production secrets:

| Variable | Description | Required | Example |
|---|---|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas replica set) | **Yes** | `mongodb+srv://admin:pass@cluster0.abc.mongodb.net/jobpilot?retryWrites=true&w=majority` |
| `AUTH_SECRET` | 32+ character secret for session token signing | **Yes** | Generate with `openssl rand -base64 32` |
| `KEY_ENCRYPTION_SECRET` | 32+ character secret for AES-256-GCM BYOK encryption | **Yes** | Generate with `openssl rand -base64 32` |
| `REDIS_URL` | Redis connection URL for BullMQ queues | Optional* | `rediss://default:token@cluster.upstash.io:6379` |
| `OPENAI_API_KEY` | Server default OpenAI key (candidates can also bring their own) | Optional | `sk-proj-...` |
| `RESEND_API_KEY` | Resend API key for transactional emails | Optional | `re_123456789...` |
| `EMAIL_FROM` | Verified sender address in Resend | Optional | `JobPilot <notifications@yourdomain.com>` |
| `APP_BASE_URL` | Canonical public URL of the application | **Yes** | `https://jobpilot.yourdomain.com` |

*\*If `REDIS_URL` is omitted, the application degrades gracefully to in-database MongoDB queue management with zero downtime.*

---

## 3. Deploying the Web Application (Vercel)

### Step 1: Push Repository to GitHub/GitLab
Ensure all code and dependencies are committed:
```bash
git push origin master
```

### Step 2: Import into Vercel
1. Log in to the [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project** and select your JobPilot repository.
3. Framework Preset: **Next.js**.
4. Root Directory: `./`.

### Step 3: Configure Environment Variables
In the Vercel project configuration, add all environment variables listed in Section 2.

### Step 4: Deploy
Click **Deploy**. Vercel will run `npm run build` and provision serverless execution handlers with edge routing.

---

## 4. Deploying the Background Worker (`worker/index.ts`)

The background worker runs repeatable discovery schedules, qualification matching processors, and transactional email dispatches. It runs as an independent Node.js process.

### Option A: Railway / Render (Containerized or Node Service)
1. Create a new service pointing to the JobPilot repository.
2. Set the start command to:
   ```bash
   npm run worker
   ```
3. Inject the same environment variables (`MONGODB_URI`, `REDIS_URL`, `RESEND_API_KEY`, etc.).
4. Resource allocation: 512MB RAM, 0.5 vCPU is sufficient for baseline workloads.

### Option B: Docker Deployment
Use the included standalone worker Dockerfile pattern:

```dockerfile
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["npm", "run", "worker"]
```

Build and run:
```bash
docker build -t jobpilot-worker .
docker run -d --name jobpilot-worker --env-file .env.production jobpilot-worker
```

The worker features clean lifecycle management and listens for `SIGINT` and `SIGTERM` signals to pause queues and finish active jobs gracefully before terminating.

---

## 5. Managed Database & Queue Provisioning

### MongoDB Atlas Setup
1. Create an **M0 (Free)** or **M10+** cluster on MongoDB Atlas.
2. In **Network Access**, add `0.0.0.0/0` (or Vercel / Railway static IP ranges).
3. In **Database Access**, create a user with `readWrite` permissions on the `jobpilot` database.
4. Copy the SRV connection string into `MONGODB_URI`.

### Redis Provisioning (Upstash Redis or Redis Cloud)
1. Create a serverless Redis database on [Upstash](https://upstash.com) or [Redis Cloud](https://redis.com).
2. Ensure TLS/SSL is enabled (`rediss://...`).
3. Copy the connection URI into `REDIS_URL`.

---

## 6. Verification & Health Monitoring

Once deployed, verify platform health using the built-in diagnostic tools:

1. **Worker Operational Status**: Visit `/settings/jobs` in the web application to inspect the real-time operational status badge (Live Redis vs Graceful MongoDB Fallback).
2. **Email Delivery Verification**: Use the "Send Test Email" tool in `/settings/jobs` to confirm Resend delivery.
3. **Queue Health Metrics**: Check Waiting, Active, Completed, and Dead-Letter job counters in `/settings/jobs`.
4. **Audit Logs & Security**: Inspect `/settings/privacy` to confirm zero-logging redaction and run a test JSON export bundle.
