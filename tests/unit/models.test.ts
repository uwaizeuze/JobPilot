import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATES,
  Application,
  Job,
  ProfessionalProfile,
  User,
  UserPreference,
} from "../../models";

describe("Mongoose database schemas and validation constraints", () => {
  it("User schema enforces required fields and valid email syntax", async () => {
    const invalidUser = new User({
      email: "not-an-email",
      name: "A", // too short (min 2)
    });

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await invalidUser.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeDefined();
    expect(error?.errors.email).toBeDefined();
    expect(error?.errors.passwordHash).toBeDefined();
    expect(error?.errors.name).toBeDefined();

    const validUser = new User({
      email: "engineer@example.com",
      passwordHash: "hashed_secret_123",
      name: "Ada Lovelace",
    });
    await expect(validUser.validate()).resolves.toBeUndefined();
  });

  it("ProfessionalProfile schema validates required references and fields", async () => {
    const invalidProfile = new ProfessionalProfile({});
    let error: mongoose.Error.ValidationError | null = null;
    try {
      await invalidProfile.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeDefined();
    expect(error?.errors.userId).toBeDefined();
    expect(error?.errors.fullName).toBeDefined();
    expect(error?.errors.email).toBeDefined();

    const validProfile = new ProfessionalProfile({
      userId: new mongoose.Types.ObjectId(),
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      remotePreference: "remote",
    });
    await expect(validProfile.validate()).resolves.toBeUndefined();
  });

  it("Application schema strictly enforces the 16 spec workflow states", async () => {
    expect(APPLICATION_STATES).toHaveLength(16);
    expect(APPLICATION_STATES).toContain("DISCOVERED");
    expect(APPLICATION_STATES).toContain("READY_FOR_REVIEW");
    expect(APPLICATION_STATES).toContain("AWAITING_APPROVAL");
    expect(APPLICATION_STATES).toContain("SUBMITTING");
    expect(APPLICATION_STATES).toContain("APPLIED");

    const invalidApp = new Application({
      userId: new mongoose.Types.ObjectId(),
      jobId: new mongoose.Types.ObjectId(),
      status: "INVALID_STATUS_NAME",
    });

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await invalidApp.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }
    expect(error?.errors.status).toBeDefined();

    const validApp = new Application({
      userId: new mongoose.Types.ObjectId(),
      jobId: new mongoose.Types.ObjectId(),
      status: "SHORTLISTED",
    });
    await expect(validApp.validate()).resolves.toBeUndefined();
  });

  it("Job schema validates required job fields", async () => {
    const invalidJob = new Job({
      title: "Software Engineer",
      // missing company, description, location, sourcePlatform, originalUrl
    });

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await invalidJob.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }

    expect(error).toBeDefined();
    expect(error?.errors.company).toBeDefined();
    expect(error?.errors.description).toBeDefined();
    expect(error?.errors.location).toBeDefined();
    expect(error?.errors.sourcePlatform).toBeDefined();
    expect(error?.errors.originalUrl).toBeDefined();
  });

  it("UserPreference validates default budget and consent policy", async () => {
    const pref = new UserPreference({
      userId: new mongoose.Types.ObjectId(),
    });

    expect(pref.monthlyTokenBudget).toBe(200000);
    expect(pref.consentPolicy).toBe("approve");
    expect(pref.globalPause).toBe(false);
    await expect(pref.validate()).resolves.toBeUndefined();

    const invalidPref = new UserPreference({
      userId: new mongoose.Types.ObjectId(),
      consentPolicy: "unauthorized_policy",
    });

    let error: mongoose.Error.ValidationError | null = null;
    try {
      await invalidPref.validate();
    } catch (err) {
      error = err as mongoose.Error.ValidationError;
    }
    expect(error?.errors.consentPolicy).toBeDefined();
  });
});
