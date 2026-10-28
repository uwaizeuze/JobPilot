import { describe, expect, it } from "vitest";
import {
  assertValidTransition,
  getStatusCategory,
  isValidTransition,
} from "@/services/application-state-machine";

describe("Phase 7: Application State Machine", () => {
  it("allows self-transitions (idempotency)", () => {
    expect(isValidTransition("DISCOVERED", "DISCOVERED")).toBe(true);
    expect(isValidTransition("APPLIED", "APPLIED")).toBe(true);
    expect(isValidTransition("INTERVIEW", "INTERVIEW")).toBe(true);
  });

  it("permits standard forward workflow transitions per Section 10.2", () => {
    // DISCOVERED -> SHORTLISTED
    expect(isValidTransition("DISCOVERED", "SHORTLISTED")).toBe(true);
    // SHORTLISTED -> PREPARING
    expect(isValidTransition("SHORTLISTED", "PREPARING")).toBe(true);
    // PREPARING -> READY_FOR_REVIEW
    expect(isValidTransition("PREPARING", "READY_FOR_REVIEW")).toBe(true);
    // READY_FOR_REVIEW -> SUBMITTING
    expect(isValidTransition("READY_FOR_REVIEW", "SUBMITTING")).toBe(true);
    // SUBMITTING -> APPLIED
    expect(isValidTransition("SUBMITTING", "APPLIED")).toBe(true);
    // APPLIED -> INTERVIEW
    expect(isValidTransition("APPLIED", "INTERVIEW")).toBe(true);
    // INTERVIEW -> OFFER
    expect(isValidTransition("INTERVIEW", "OFFER")).toBe(true);
  });

  it("permits candidate cancellation from active workflow states per Section 10.4", () => {
    expect(isValidTransition("DISCOVERED", "CANCELLED")).toBe(true);
    expect(isValidTransition("ANALYZING", "CANCELLED")).toBe(true);
    expect(isValidTransition("SHORTLISTED", "CANCELLED")).toBe(true);
    expect(isValidTransition("PREPARING", "CANCELLED")).toBe(true);
    expect(isValidTransition("READY_FOR_REVIEW", "CANCELLED")).toBe(true);
    expect(isValidTransition("AWAITING_APPROVAL", "CANCELLED")).toBe(true);
    expect(isValidTransition("SUBMITTING", "CANCELLED")).toBe(true);
    expect(isValidTransition("APPLIED", "CANCELLED")).toBe(true);
  });

  it("rejects illegal transitions that bypass validation or pipeline order", () => {
    // Cannot jump from DISCOVERED directly to APPLIED without preparing or submitting
    expect(isValidTransition("DISCOVERED", "APPLIED")).toBe(false);
    expect(() => assertValidTransition("DISCOVERED", "APPLIED")).toThrow(
      /Invalid application status transition from 'DISCOVERED' to 'APPLIED'/
    );

    // Cannot jump from DISCOVERED directly to OFFER
    expect(isValidTransition("DISCOVERED", "OFFER")).toBe(false);

    // Cannot jump from REJECTED directly to OFFER
    expect(isValidTransition("REJECTED", "OFFER")).toBe(false);

    // Cannot jump from NOT_QUALIFIED directly to SUBMITTING
    expect(isValidTransition("NOT_QUALIFIED", "SUBMITTING")).toBe(false);
  });

  it("categorizes all 16 application states into 5 tracker Kanban buckets", () => {
    expect(getStatusCategory("DISCOVERED")).toBe("SAVED");
    expect(getStatusCategory("SHORTLISTED")).toBe("SAVED");
    expect(getStatusCategory("PREPARING")).toBe("PREPARING");
    expect(getStatusCategory("READY_FOR_REVIEW")).toBe("PREPARING");
    expect(getStatusCategory("APPLIED")).toBe("APPLIED");
    expect(getStatusCategory("INTERVIEW")).toBe("INTERVIEW");
    expect(getStatusCategory("ASSESSMENT")).toBe("INTERVIEW");
    expect(getStatusCategory("OFFER")).toBe("OUTCOME");
    expect(getStatusCategory("REJECTED")).toBe("OUTCOME");
    expect(getStatusCategory("WITHDRAWN")).toBe("OUTCOME");
  });
});
