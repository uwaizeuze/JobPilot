import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { jobDiscoveryService } from "@/services/job-discovery.service";

const DiscoverSchema = z.object({
  provider: z.string().min(1, "Provider name is required"),
  companyToken: z.string().min(1, "Company identifier is required"),
  query: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
});

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = DiscoverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await jobDiscoveryService.discoverFromProvider(
      session.userId,
      parsed.data.provider,
      {
        companyToken: parsed.data.companyToken,
        query: parsed.data.query,
        limit: parsed.data.limit,
      }
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error running job discovery";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
