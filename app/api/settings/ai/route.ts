import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { openAIProvider } from "@/lib/ai";
import { encryptApiKey, maskApiKey } from "@/lib/crypto";
import { connectToDatabase } from "@/lib/db";
import { UserPreference } from "@/models/preference";

const UpdateAISettingsSchema = z.object({
  apiKey: z.string().optional(),
  monthlyTokenBudget: z.number().min(1000).max(5000000).optional(),
  maxApplicationsPerDay: z.number().min(1).max(50).optional(),
  allowedModels: z.array(z.string()).optional(),
  consentPolicy: z.enum(["auto", "approve"]).optional(),
  globalPause: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const preference = await UserPreference.findOne({ userId: session.userId });

    const isServerKeySet = Boolean(process.env.OPENAI_API_KEY?.startsWith("sk-"));
    const isUserKeySet = Boolean(preference?.keyLastFour);
    const isConfigured = isUserKeySet || isServerKeySet;

    return NextResponse.json({
      isConfigured,
      keyLastFour: preference?.keyLastFour || (isServerKeySet ? "env" : ""),
      isUserKey: isUserKeySet,
      monthlyTokenBudget: preference?.monthlyTokenBudget ?? 200000,
      tokensUsedThisMonth: preference?.tokensUsedThisMonth ?? 0,
      maxApplicationsPerDay: preference?.maxApplicationsPerDay ?? 10,
      allowedModels: preference?.allowedModels ?? ["gpt-4o-mini", "gpt-4o"],
      consentPolicy: preference?.consentPolicy ?? "approve",
      globalPause: preference?.globalPause ?? false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error reading AI settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateAISettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let preference = await UserPreference.findOne({ userId: session.userId });
    if (!preference) {
      preference = new UserPreference({ userId: session.userId });
    }

    // Handle new API Key submission
    if (parsed.data.apiKey && parsed.data.apiKey.trim()) {
      const cleanKey = parsed.data.apiKey.trim();

      // Test validation call
      const validation = await openAIProvider.validateKey(cleanKey);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "Failed to validate OpenAI API key." },
          { status: 400 }
        );
      }

      // Encrypt and store key safely
      const encrypted = encryptApiKey(cleanKey);
      preference.encryptedApiKey = encrypted;
      preference.keyLastFour = cleanKey.slice(-4);
    }

    if (parsed.data.monthlyTokenBudget !== undefined) {
      preference.monthlyTokenBudget = parsed.data.monthlyTokenBudget;
    }

    if (parsed.data.maxApplicationsPerDay !== undefined) {
      preference.maxApplicationsPerDay = parsed.data.maxApplicationsPerDay;
    }

    if (parsed.data.allowedModels !== undefined) {
      preference.allowedModels = parsed.data.allowedModels;
    }

    if (parsed.data.consentPolicy !== undefined) {
      preference.consentPolicy = parsed.data.consentPolicy;
    }

    if (parsed.data.globalPause !== undefined) {
      preference.globalPause = parsed.data.globalPause;
    }

    await preference.save();

    return NextResponse.json({
      success: true,
      message: "AI Agent settings updated successfully.",
      isConfigured: true,
      keyLastFour: preference.keyLastFour,
      maskedKey: maskApiKey(`sk-...${preference.keyLastFour}`),
      monthlyTokenBudget: preference.monthlyTokenBudget,
      tokensUsedThisMonth: preference.tokensUsedThisMonth,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error saving AI settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const preference = await UserPreference.findOne({ userId: session.userId });
    if (preference) {
      preference.encryptedApiKey = undefined;
      preference.keyLastFour = "";
      await preference.save();
    }

    return NextResponse.json({
      success: true,
      message: "Custom API key removed. AI agent will use default fallback if configured.",
      isConfigured: Boolean(process.env.OPENAI_API_KEY?.startsWith("sk-")),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error removing API key";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
