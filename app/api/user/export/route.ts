import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataManagementService } from "@/services/data-management.service";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 5 exports per minute
    const rateCheck = checkRateLimit(req, "export", user.id);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many data export requests. Please wait before exporting again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.resetSeconds),
            "X-RateLimit-Limit": String(rateCheck.limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const dataBundle = await dataManagementService.exportAllUserData(user.id);
    const jsonString = JSON.stringify(dataBundle, null, 2);

    return new Response(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="jobpilot-user-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "X-RateLimit-Limit": String(rateCheck.limit),
        "X-RateLimit-Remaining": String(rateCheck.remaining),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error exporting user data";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
