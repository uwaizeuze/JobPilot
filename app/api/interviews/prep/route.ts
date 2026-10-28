import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { InterviewPrepPack } from "@/models/interview";
import { Job } from "@/models/job";
import { interviewCoachService } from "@/services/interview-coach.service";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    await connectToDatabase();

    if (jobId) {
      const prepPack = await InterviewPrepPack.findOne({
        userId: session.userId,
        jobId,
      }).populate("jobId", "title company location workMode");

      if (!prepPack) {
        return NextResponse.json({ error: "Prep pack not found" }, { status: 404 });
      }

      return NextResponse.json({ prepPack });
    }

    const prepPacks = await InterviewPrepPack.find({ userId: session.userId })
      .sort({ updatedAt: -1 })
      .populate("jobId", "title company location workMode requiredSkills")
      .exec();

    return NextResponse.json({ prepPacks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error retrieving prep packs";
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
    const { jobId, forceRegenerate } = body;

    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    await connectToDatabase();
    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: `Job '${jobId}' not found` }, { status: 404 });
    }

    const prepPack = await interviewCoachService.generatePrepPack(
      session.userId,
      jobId,
      Boolean(forceRegenerate)
    );

    return NextResponse.json({ prepPack });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error generating prep pack";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
