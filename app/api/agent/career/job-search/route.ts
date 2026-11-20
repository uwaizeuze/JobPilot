import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { ProfessionalProfile, type IProfessionalProfile } from "@/models/profile";
import { UserPreference } from "@/models/preference";
import { decryptApiKey } from "@/lib/crypto";
import { openAIProvider } from "@/lib/ai";
import { z } from "zod";

// ─── Request Validation ──────────────────────────────────────────────────────

const JobSearchRequestSchema = z.object({
  roleTitle: z.string().min(2).max(120),
  location: z.string().optional().default("Remote / India"),
  yearsOfExperience: z.coerce.number().min(0).max(40).optional().default(5),
  skills: z.string().optional().default(""),
  companyType: z
    .enum(["any", "product", "startup", "faang", "service", "consulting"])
    .optional()
    .default("any"),
  notes: z.string().max(500).optional().default(""),
});

// ─── Response Types ──────────────────────────────────────────────────────────

export interface JobSearchResult {
  title: string;
  company: string;
  location: string;
  workMode: string;
  experienceRequired: string;
  skills: string[];
  description: string;
  whyMatch: string;
  applyUrl: string;
  platform: string;
  postedDate: string;
  salaryRange?: string;
  matchScore?: number;
}

// ─── Zod schema for AI structured output ────────────────────────────────────

const AIJobResultSchema = z.object({
  jobs: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      location: z.string(),
      workMode: z.enum(["remote", "hybrid", "onsite"]),
      experienceRequired: z.string(),
      skills: z.array(z.string()).max(8),
      description: z.string(),
      whyMatch: z.string(),
      applyUrl: z.string().url().catch("https://www.linkedin.com/jobs/"),
      platform: z.string(),
      postedDate: z.string(),
      salaryRange: z.string().optional(),
      matchScore: z.number().min(0).max(100).optional(),
    })
  ).min(1).max(10),
});

// ─── Helper: build a rich profile context string ─────────────────────────────

function buildProfileContext(
  profile: IProfessionalProfile | null,
  params: z.infer<typeof JobSearchRequestSchema>
): string {
  if (!profile) {
    return `Candidate seeking ${params.roleTitle} with ${params.yearsOfExperience} years of experience.`;
  }

  const skills = (profile.technicalSkills ?? [])
    .map((s: { name: string }) => s.name)
    .slice(0, 15)
    .join(", ") || "Not specified";

  const employment = (profile.employmentHistory ?? [])
    .slice(0, 3)
    .map((e: { title: string; company: string; current: boolean; endDate?: string }) =>
      `${e.title} at ${e.company} (${e.current ? "Current" : (e.endDate ?? "Past")})`
    )
    .join(" | ") || "Not provided";

  const education = (profile.education ?? [])
    .slice(0, 2)
    .map((e: { degree: string; institution: string }) => `${e.degree} – ${e.institution}`)
    .join(", ") || "Not provided";

  const projects = (profile.projects ?? [])
    .slice(0, 3)
    .map((p: { title: string; description: string }) => `• ${p.title}: ${p.description.slice(0, 100)}`)
    .join("\n") || "Not provided";

  return `
=== CANDIDATE PROFILE ===
Name: ${profile.fullName || "Candidate"}
Headline: ${profile.headline || "Software Engineer"}
Total Experience: ${profile.totalExperienceYears || params.yearsOfExperience} years
Current Employer: ${profile.currentEmployer || "Not specified"}

Technical Skills: ${skills}

Employment History: ${employment}

Education: ${education}

Notable Projects:
${projects}

Professional Summary: ${(profile.summary ?? "").slice(0, 400) || "Experienced software engineer."}
=========================`.trim();
}

// ─── Helper: build the AI system prompt ─────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are a world-class technical talent advisor and recruiting expert with deep expertise in the Indian and global technology job market (2025-2026).

Your role is to generate highly relevant, real-world job listings for a software engineering candidate based on their detailed profile and search parameters.

STRICT RULES:
1. Generate EXACTLY 8 job listings that reflect current real-world hiring conditions.
2. All companies must be real, well-known tech organizations hiring in India or globally.
3. Apply URLs must be REAL, working career portal URLs (use the company's official careers page or a known platform like LinkedIn, Naukri, Wellfound, Glassdoor, Indeed).
4. Salary ranges must reflect current 2025-2026 Indian tech market rates in LPA (Lakhs Per Annum) or USD for global roles.
5. The "whyMatch" field MUST be specific to this candidate's actual skills, projects, and background provided — not generic statements.
6. The "matchScore" (0-100) must reflect how well the candidate's specific skills and experience genuinely match this role.
7. Vary the company tier: include 2-3 large established companies, 2-3 funded startups/unicorns, and 2-3 MNCs or global tech companies.
8. Include a diverse mix of work modes: some remote, some hybrid, some onsite.
9. Do NOT repeat companies from one search to another — generate fresh, diverse results each time.
10. Return ONLY valid JSON matching the requested schema. Zero markdown, zero explanation, zero extra text.`;
}

// ─── Helper: build the user prompt ──────────────────────────────────────────

function buildUserPrompt(
  profileContext: string,
  params: z.infer<typeof JobSearchRequestSchema>
): string {
  const companyGuidance: Record<string, string> = {
    any: "Mix of product companies, startups, and MNCs",
    product: "Top product-first tech companies (Razorpay, Swiggy, Zepto, CRED, Meesho, Groww, etc.)",
    startup: "High-growth funded startups and unicorns (Series A-D, well-funded)",
    faang: "FAANG and Big Tech (Google, Microsoft, Amazon, Meta, Apple, OpenAI, Anthropic India offices)",
    service: "IT services and outsourcing firms (Infosys, TCS, Wipro, HCL, LTIMindtree, Capgemini)",
    consulting: "Top consulting and advisory firms (McKinsey Digital, Deloitte Tech, BCG Gamma, Accenture AI)",
  };

  return `${profileContext}

=== SEARCH PARAMETERS ===
Target Role: ${params.roleTitle}
Location Preference: ${params.location}
Years of Experience: ${params.yearsOfExperience}
Key Skills to Highlight: ${params.skills || "Use candidate's existing skills from profile above"}
Company Type Preference: ${companyGuidance[params.companyType] || companyGuidance.any}
Additional Candidate Notes: ${params.notes || "None"}
Current Date: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
=========================

Generate 8 fresh, diverse, highly relevant job listings that maximally leverage this candidate's specific background.

For each job, calculate a realistic matchScore (0-100) based on actual skill overlap, experience alignment, and role fit.

Required JSON structure:
{
  "jobs": [
    {
      "title": "exact job title matching the role posted",
      "company": "real company name",
      "location": "City, Country or Remote",
      "workMode": "remote" | "hybrid" | "onsite",
      "experienceRequired": "X-Y years",
      "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
      "description": "2-3 specific sentences about the role, team, and what you will build",
      "whyMatch": "1-2 sentences specifically referencing this candidate's actual projects, skills, and experience",
      "applyUrl": "https://[real-careers-url]",
      "platform": "LinkedIn | Naukri | Wellfound | Indeed | Company Website | Glassdoor",
      "postedDate": "X days ago | Today | X hours ago",
      "salaryRange": "₹XX LPA - ₹XX LPA",
      "matchScore": 0-100
    }
  ]
}`;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse & validate request body
    const rawBody = await req.json();
    const parsed = JobSearchRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const params = parsed.data;

    // 3. Connect to DB and fetch profile + preferences in parallel
    await connectToDatabase();
    const [profile, preference] = await Promise.all([
      ProfessionalProfile.findOne({ userId: sessionUser.userId }).lean() as Promise<IProfessionalProfile | null>,
      UserPreference.findOne({ userId: sessionUser.userId }).select("+encryptedApiKey").lean(),
    ]);

    // 4. Resolve API key: user key > DEPLOY_API_KEY > OPENAI_API_KEY
    let userApiKey: string | undefined;
    if ((preference as { encryptedApiKey?: string } | null)?.encryptedApiKey) {
      try {
        userApiKey = decryptApiKey((preference as { encryptedApiKey: string }).encryptedApiKey);
      } catch {
        // Key decryption failed; will fall back to env key
      }
    }

    const isAIConfigured = openAIProvider.isConfigured(userApiKey);
    if (!isAIConfigured) {
      return NextResponse.json(
        {
          error:
            "No AI API key configured. Please add your API key in Settings → AI Settings to enable AI-powered job search.",
          requiresApiKey: true,
        },
        { status: 400 }
      );
    }

    // 5. Check token budget
    const typedPref = preference as {
      tokensUsedThisMonth?: number;
      monthlyTokenBudget?: number;
      aiBaseUrl?: string;
      aiModel?: string;
    } | null;

    if (
      typedPref &&
      typeof typedPref.tokensUsedThisMonth === "number" &&
      typeof typedPref.monthlyTokenBudget === "number" &&
      typedPref.tokensUsedThisMonth >= typedPref.monthlyTokenBudget
    ) {
      return NextResponse.json(
        {
          error:
            "Monthly AI token budget exhausted. Please increase your budget in Settings → AI Settings or wait for monthly reset.",
          budgetExhausted: true,
        },
        { status: 429 }
      );
    }

    // 6. Build prompts
    const profileContext = buildProfileContext(profile, params);
    const systemPrompt = buildSystemPrompt();
    const prompt = buildUserPrompt(profileContext, params);

    // 7. Call AI with structured output
    const result = await openAIProvider.generateStructured<z.infer<typeof AIJobResultSchema>>({
      schema: AIJobResultSchema,
      systemPrompt,
      prompt,
      apiKey: userApiKey,
      baseUrl: typedPref?.aiBaseUrl,
      model: typedPref?.aiModel,
    });

    // 8. Update token usage
    if (result.tokensUsed > 0 && typedPref) {
      await UserPreference.findOneAndUpdate(
        { userId: sessionUser.userId },
        { $inc: { tokensUsedThisMonth: result.tokensUsed } }
      );
    }

    // 9. Sort by matchScore descending
    const sortedJobs = [...result.data.jobs].sort(
      (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)
    );

    return NextResponse.json({
      jobs: sortedJobs,
      count: sortedJobs.length,
      model: result.model,
      tokensUsed: result.tokensUsed,
      profileMatched: Boolean(profile),
      searchParams: params,
      source: "ai",
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/agent/career/job-search] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
