import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getSessionCookieOptions } from "@/lib/auth";
import { dataManagementService } from "@/services/data-management.service";

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Confirmation challenge failed. You must provide confirmation: 'DELETE'." },
        { status: 400 }
      );
    }

    await dataManagementService.deleteAccountCompletely(user.id);

    const response = NextResponse.json({
      success: true,
      message: "Account and all associated documents permanently deleted.",
    });

    // Invalidate and expire session cookie
    const cookieOpts = getSessionCookieOptions();
    response.cookies.set({
      name: cookieOpts.name,
      value: "",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error deleting account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
