import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { providerRegistry } from "@/providers";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const catalog = await providerRegistry.getCatalog();
    return NextResponse.json({ providers: catalog });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error fetching provider catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
