import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { jobDiscoveryService } from "@/services/job-discovery.service";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || undefined;
    const workMode = (searchParams.get("workMode") as "remote" | "hybrid" | "onsite") || undefined;
    const location = searchParams.get("location") || undefined;
    const company = searchParams.get("company") || undefined;
    const status = (searchParams.get("status") as "open" | "closed" | "expired") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const sortBy = (searchParams.get("sortBy") as "dateDiscovered" | "postingDate" | "matchScore") || "dateDiscovered";
    const minMatchScore = searchParams.get("minMatch")
      ? parseInt(searchParams.get("minMatch")!, 10)
      : undefined;

    const result = await jobDiscoveryService.getJobs({
      userId: session.userId,
      query,
      workMode,
      location,
      company,
      status,
      page,
      limit,
      sortBy,
      minMatchScore,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error fetching jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
