import type { ApplicationStatus } from "@/models/application";

/**
 * Valid state transitions for the autonomous job application pipeline
 * strictly derived from Section 10.2 and Section 10.3 of the JobPilot Specification.
 */
export const VALID_TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  DISCOVERED: ["ANALYZING", "SHORTLISTED", "NOT_QUALIFIED", "CANCELLED"],
  ANALYZING: ["SHORTLISTED", "NOT_QUALIFIED", "FAILED", "CANCELLED"],
  NOT_QUALIFIED: ["SHORTLISTED", "CANCELLED"],
  SHORTLISTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_REVIEW", "FAILED", "CANCELLED"],
  READY_FOR_REVIEW: ["AWAITING_APPROVAL", "SUBMITTING", "PREPARING", "CANCELLED"],
  AWAITING_APPROVAL: ["SUBMITTING", "PREPARING", "READY_FOR_REVIEW", "CANCELLED"],
  SUBMITTING: ["APPLIED", "FAILED", "CANCELLED"],
  APPLIED: ["ASSESSMENT", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "CANCELLED"],
  FAILED: ["PREPARING", "SUBMITTING", "CANCELLED"],
  ASSESSMENT: ["INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN", "CANCELLED"],
  INTERVIEW: ["OFFER", "ASSESSMENT", "REJECTED", "WITHDRAWN", "CANCELLED"],
  OFFER: ["WITHDRAWN", "APPLIED", "CANCELLED"],
  REJECTED: ["DISCOVERED", "CANCELLED"],
  WITHDRAWN: ["DISCOVERED", "CANCELLED"],
  CANCELLED: ["DISCOVERED"],
} as const;

/**
 * Checks whether transitioning from `fromStatus` to `toStatus` is valid.
 */
export function isValidTransition(
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus
): boolean {
  if (fromStatus === toStatus) return true;
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Asserts that transitioning from `fromStatus` to `toStatus` is valid,
 * otherwise throws a descriptive Error.
 */
export function assertValidTransition(
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus
): void {
  if (!isValidTransition(fromStatus, toStatus)) {
    const allowed = (VALID_TRANSITIONS[fromStatus] || []).join(", ") || "none";
    throw new Error(
      `Invalid application status transition from '${fromStatus}' to '${toStatus}'. Allowed transitions from '${fromStatus}' are: [${allowed}].`
    );
  }
}

/**
 * Helper to get user-friendly category for grouping in Kanban
 */
export type TrackerCategory =
  | "SAVED"
  | "PREPARING"
  | "APPLIED"
  | "INTERVIEW"
  | "OUTCOME";

export function getStatusCategory(status: ApplicationStatus): TrackerCategory {
  switch (status) {
    case "DISCOVERED":
    case "ANALYZING":
    case "SHORTLISTED":
    case "NOT_QUALIFIED":
      return "SAVED";
    case "PREPARING":
    case "READY_FOR_REVIEW":
    case "AWAITING_APPROVAL":
      return "PREPARING";
    case "SUBMITTING":
    case "APPLIED":
      return "APPLIED";
    case "ASSESSMENT":
    case "INTERVIEW":
      return "INTERVIEW";
    case "OFFER":
    case "REJECTED":
    case "WITHDRAWN":
    case "CANCELLED":
    case "FAILED":
      return "OUTCOME";
    default:
      return "SAVED";
  }
}
