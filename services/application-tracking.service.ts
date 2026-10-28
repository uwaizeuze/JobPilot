import { connectToDatabase } from "@/lib/db";
import {
  Application,
  type ApplicationStatus,
  type IApplication,
} from "@/models/application";
import { ApplicationEvent, type IApplicationEvent } from "@/models/application-event";
import { Job, type IJob } from "@/models/job";
import { assertValidTransition } from "./application-state-machine";
import { duplicateDetectionService } from "./duplicate-detection.service";

export interface CreateApplicationInput {
  jobId: string;
  status?: ApplicationStatus;
  resumeVersionId?: string;
  coverLetterId?: string;
  notes?: string;
  submissionMethod?: "auto" | "prefill" | "manual";
  recruiterContact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  interviewDate?: string | Date;
  followUpDate?: string | Date;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  statusReason?: string;
  notes?: string;
  submissionMethod?: "auto" | "prefill" | "manual";
  recruiterContact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  interviewDate?: string | Date | null;
  followUpDate?: string | Date | null;
  appliedDate?: string | Date | null;
  confirmationReference?: string;
}

export class ApplicationTrackingService {
  /**
   * Creates a new application entry with duplicate detection and audit event emission
   */
  async createApplication(
    userId: string,
    input: CreateApplicationInput
  ): Promise<IApplication> {
    await connectToDatabase();

    const job = await Job.findById(input.jobId);
    if (!job) {
      throw new Error(`Target job '${input.jobId}' not found.`);
    }

    // Check for exact duplicates
    const dupCheck = await duplicateDetectionService.checkDuplicate(userId, input.jobId);
    if (dupCheck.isDuplicate && dupCheck.existingApplicationId) {
      const existing = await Application.findById(dupCheck.existingApplicationId);
      if (existing) {
        return existing;
      }
    }

    const initialStatus = input.status || "DISCOVERED";

    const app = await Application.create({
      userId,
      jobId: input.jobId,
      status: initialStatus,
      resumeVersionId: input.resumeVersionId,
      coverLetterId: input.coverLetterId,
      notes: input.notes || "",
      submissionMethod: input.submissionMethod || "manual",
      recruiterContact: input.recruiterContact,
      interviewDate: input.interviewDate ? new Date(input.interviewDate) : undefined,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
      duplicateChecked: true,
    });

    await ApplicationEvent.create({
      applicationId: app._id,
      userId,
      fromStatus: undefined,
      toStatus: initialStatus,
      reason: "Application record created in tracker.",
      details: { jobId: input.jobId, submissionMethod: app.submissionMethod },
    });

    return app;
  }

  /**
   * Updates an application status enforcing the state machine transition table
   */
  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    newStatus: ApplicationStatus,
    reason?: string,
    details?: Record<string, unknown>
  ): Promise<IApplication> {
    await connectToDatabase();

    const app = await Application.findOne({ _id: applicationId, userId });
    if (!app) {
      throw new Error("Application not found or unauthorized.");
    }

    const currentStatus = app.status;
    if (currentStatus === newStatus) {
      return app;
    }

    // Validate transition against state machine rules
    assertValidTransition(currentStatus, newStatus);

    app.status = newStatus;
    if (reason) {
      app.statusReason = reason;
    }

    if (newStatus === "APPLIED" && !app.appliedDate) {
      app.appliedDate = new Date();
    }

    await app.save();

    await ApplicationEvent.create({
      applicationId: app._id,
      userId,
      fromStatus: currentStatus,
      toStatus: newStatus,
      reason: reason || `Status changed from ${currentStatus} to ${newStatus}.`,
      details,
    });

    return app;
  }

  /**
   * Updates general application fields (notes, recruiter contact, dates)
   */
  async updateApplication(
    userId: string,
    applicationId: string,
    updates: UpdateApplicationInput
  ): Promise<IApplication> {
    await connectToDatabase();

    const app = await Application.findOne({ _id: applicationId, userId });
    if (!app) {
      throw new Error("Application not found or unauthorized.");
    }

    if (updates.status && updates.status !== app.status) {
      await this.updateApplicationStatus(
        userId,
        applicationId,
        updates.status,
        updates.statusReason
      );
    }

    if (updates.notes !== undefined) app.notes = updates.notes;
    if (updates.submissionMethod) app.submissionMethod = updates.submissionMethod;
    if (updates.confirmationReference !== undefined) {
      app.confirmationReference = updates.confirmationReference;
    }
    if (updates.recruiterContact) {
      app.recruiterContact = {
        ...app.recruiterContact,
        ...updates.recruiterContact,
      };
    }

    if (updates.interviewDate !== undefined) {
      app.interviewDate = updates.interviewDate ? new Date(updates.interviewDate) : undefined;
    }

    if (updates.followUpDate !== undefined) {
      app.followUpDate = updates.followUpDate ? new Date(updates.followUpDate) : undefined;
    }

    if (updates.appliedDate !== undefined) {
      app.appliedDate = updates.appliedDate ? new Date(updates.appliedDate) : undefined;
    }

    await app.save();
    return app;
  }

  /**
   * Lists all applications for a user with optional status filter and search query
   */
  async listApplications(
    userId: string,
    filters?: {
      status?: ApplicationStatus;
      search?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ applications: (IApplication & { jobId: IJob })[]; total: number }> {
    await connectToDatabase();

    const query: Record<string, unknown> = { userId };
    if (filters?.status) {
      query.status = filters.status;
    }

    const apps = await Application.find(query)
      .sort({ updatedAt: -1 })
      .populate<{ jobId: IJob }>("jobId")
      .populate("resumeVersionId")
      .populate("coverLetterId");

    let filtered = apps;
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = apps.filter((app) => {
        const title = (app.jobId?.title || "").toLowerCase();
        const company = (app.jobId?.company || "").toLowerCase();
        const loc = (app.jobId?.location || "").toLowerCase();
        return title.includes(q) || company.includes(q) || loc.includes(q);
      });
    }

    const total = filtered.length;
    const skip = filters?.skip || 0;
    const limit = filters?.limit || 100;
    const paginated = filtered.slice(skip, skip + limit);

    return {
      applications: paginated as unknown as (IApplication & { jobId: IJob })[],
      total,
    };
  }

  /**
   * Retrieves single application with full population and event timeline
   */
  async getApplicationById(
    userId: string,
    applicationId: string
  ): Promise<{
    application: IApplication & { jobId: IJob };
    events: IApplicationEvent[];
  }> {
    await connectToDatabase();

    const application = await Application.findOne({
      _id: applicationId,
      userId,
    })
      .populate<{ jobId: IJob }>("jobId")
      .populate("resumeVersionId")
      .populate("coverLetterId");

    if (!application) {
      throw new Error("Application not found.");
    }

    const events = await ApplicationEvent.find({ applicationId: application._id }).sort({
      timestamp: -1,
    });

    return {
      application: application as unknown as IApplication & { jobId: IJob },
      events,
    };
  }

  /**
   * Adds an audit event or timeline note
   */
  async addApplicationEvent(
    userId: string,
    applicationId: string,
    input: {
      toStatus?: string;
      reason: string;
      details?: Record<string, unknown>;
    }
  ): Promise<IApplicationEvent> {
    await connectToDatabase();

    const app = await Application.findOne({ _id: applicationId, userId });
    if (!app) {
      throw new Error("Application not found or unauthorized.");
    }

    const event = await ApplicationEvent.create({
      applicationId: app._id,
      userId,
      fromStatus: app.status,
      toStatus: input.toStatus || app.status,
      reason: input.reason,
      details: input.details,
    });

    return event;
  }

  /**
   * Deletes or archives an application
   */
  async deleteApplication(userId: string, applicationId: string): Promise<boolean> {
    await connectToDatabase();

    const result = await Application.deleteOne({ _id: applicationId, userId });
    if (result.deletedCount > 0) {
      await ApplicationEvent.deleteMany({ applicationId });
      return true;
    }
    return false;
  }
}

export const applicationTrackingService = new ApplicationTrackingService();
