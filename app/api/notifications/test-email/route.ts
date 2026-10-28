import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { notificationService } from "@/services/notification.service";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({
        configured: false,
        sent: false,
        message: "Email provider is not configured. Set RESEND_API_KEY and EMAIL_FROM in .env to enable outbound delivery.",
      });
    }

    const result = await notificationService.sendNotification({
      userId: user.id,
      title: "JobPilot Email Dispatch Test",
      message: "This is a test notification confirming that outbound transactional email delivery via Resend is operational.",
      eventType: "daily_summary",
      link: "/settings/jobs",
      recipientEmail: user.email,
    });

    return NextResponse.json({
      configured: true,
      sent: result.emailSent,
      message: result.emailSent
        ? `Test notification successfully dispatched to ${user.email}.`
        : "Failed to deliver email through provider. Verify API key and verified domain.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error sending test email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
