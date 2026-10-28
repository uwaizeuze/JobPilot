import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toolRegistry } from "@/services/tool-registry";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tools = toolRegistry.getAllTools().map((t) => ({
      name: t.name,
      description: t.description,
      timeoutMs: t.timeoutMs ?? 30000,
    }));

    return NextResponse.json({
      success: true,
      count: tools.length,
      tools,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error listing tools";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
