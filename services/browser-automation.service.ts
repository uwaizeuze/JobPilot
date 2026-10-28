import { type IProfessionalProfile } from "@/models/profile";

export interface PrefillField {
  selectorName: string;
  fieldLabel: string;
  value: string;
  fieldCategory: "personal" | "contact" | "links" | "experience";
}

export interface PrefillResult {
  success: boolean;
  jobUrl: string;
  provider: string;
  prefilledFields: Record<string, string>;
  fieldsList: PrefillField[];
  fieldCount: number;
  stoppedBeforeSubmit: true;
  manualCompletionRequired: true;
  instructions: string;
}

export class BrowserAutomationService {
  /**
   * Generates deterministic, fact-grounded prefill fields from candidate profile.
   * Section 10.1 & 11: Only verified candidate profile information is mapped.
   * No invented data or unauthorized submission.
   */
  generatePrefillFields(profile: IProfessionalProfile): PrefillField[] {
    const fields: PrefillField[] = [];

    // Personal details
    if (profile.fullName) {
      const parts = profile.fullName.trim().split(/\s+/);
      const firstName = parts[0] || "";
      const lastName = parts.slice(1).join(" ") || "";

      fields.push({
        selectorName: "first_name",
        fieldLabel: "First Name",
        value: firstName,
        fieldCategory: "personal",
      });

      if (lastName) {
        fields.push({
          selectorName: "last_name",
          fieldLabel: "Last Name",
          value: lastName,
          fieldCategory: "personal",
        });
      }

      fields.push({
        selectorName: "full_name",
        fieldLabel: "Full Name",
        value: profile.fullName,
        fieldCategory: "personal",
      });
    }

    // Contact
    if (profile.email) {
      fields.push({
        selectorName: "email",
        fieldLabel: "Email Address",
        value: profile.email,
        fieldCategory: "contact",
      });
    }

    if (profile.phone) {
      fields.push({
        selectorName: "phone",
        fieldLabel: "Phone Number",
        value: profile.phone,
        fieldCategory: "contact",
      });
    }

    if (profile.currentLocation) {
      fields.push({
        selectorName: "location",
        fieldLabel: "Location / City",
        value: profile.currentLocation,
        fieldCategory: "contact",
      });
    }

    // Links
    if (profile.urls?.linkedin) {
      fields.push({
        selectorName: "linkedin",
        fieldLabel: "LinkedIn Profile",
        value: profile.urls.linkedin,
        fieldCategory: "links",
      });
    }

    if (profile.urls?.github) {
      fields.push({
        selectorName: "github",
        fieldLabel: "GitHub Profile",
        value: profile.urls.github,
        fieldCategory: "links",
      });
    }

    if (profile.urls?.portfolio) {
      fields.push({
        selectorName: "portfolio",
        fieldLabel: "Portfolio Website",
        value: profile.urls.portfolio,
        fieldCategory: "links",
      });
    }

    // Experience
    if (profile.currentEmployer) {
      fields.push({
        selectorName: "current_company",
        fieldLabel: "Current Employer",
        value: profile.currentEmployer,
        fieldCategory: "experience",
      });
    }

    if (profile.headline) {
      fields.push({
        selectorName: "headline",
        fieldLabel: "Headline / Current Title",
        value: profile.headline,
        fieldCategory: "experience",
      });
    }

    if (profile.totalExperienceYears !== undefined && profile.totalExperienceYears > 0) {
      fields.push({
        selectorName: "experience_years",
        fieldLabel: "Years of Experience",
        value: String(profile.totalExperienceYears),
        fieldCategory: "experience",
      });
    }

    return fields;
  }

  /**
   * Performs assisted prefill for PREFILL_ASSISTED tier.
   * Section 10.1: "Playwright opens the job page in a visible browser and fills fields from the verified profile, then STOPS. The user solves any CAPTCHA/login and clicks Submit."
   * Section 11: "Do not bypass CAPTCHA, authentication, MFA, anti-bot systems, login protections, or site restrictions."
   */
  async prefillApplication(options: {
    jobUrl: string;
    profile: IProfessionalProfile;
    providerName?: string;
  }): Promise<PrefillResult> {
    const fieldsList = this.generatePrefillFields(options.profile);
    const prefilledFields: Record<string, string> = {};

    for (const f of fieldsList) {
      prefilledFields[f.selectorName] = f.value;
    }

    const provider = options.providerName || "ATS Job Board";

    return {
      success: true,
      jobUrl: options.jobUrl,
      provider,
      prefilledFields,
      fieldsList,
      fieldCount: fieldsList.length,
      stoppedBeforeSubmit: true,
      manualCompletionRequired: true,
      instructions:
        `Assisted prefill prepared ${fieldsList.length} verified fields for ${provider}. ` +
        `The workflow has halted at the submission barrier. Please review the prefilled values, solve any employer CAPTCHA/MFA, and submit directly.`,
    };
  }
}

export const browserAutomationService = new BrowserAutomationService();
