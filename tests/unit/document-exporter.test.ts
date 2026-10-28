// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  generateCoverLetterDocx,
  generateCoverLetterPdf,
  generateResumeDocx,
  generateResumePdf,
  type TailoredResumeContent,
} from "@/lib/document-exporter";

describe("Phase 6: Binary Document Exporter (PDF & DOCX)", () => {
  const mockContent: TailoredResumeContent = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+1 555-0100",
    location: "London, UK",
    urls: {
      github: "github.com/adalovelace",
      linkedin: "linkedin.com/in/adalovelace",
    },
    headline: "Senior Software Engineer",
    summary:
      "Pioneering computer scientist with extensive experience in computational algorithms and clean software architecture.",
    skills: ["TypeScript", "Algorithm Design", "Mathematical Modeling", "React"],
    experience: [
      {
        company: "Babbage Analytics",
        title: "Lead Systems Architect",
        location: "London",
        startDate: "1843",
        current: true,
        responsibilities: [
          "Developed initial algorithm instructions for the Analytical Engine.",
          "Collaborated on punch card calculation architecture.",
        ],
      },
    ],
    education: [
      {
        institution: "University of London",
        degree: "B.S. in Mathematics",
        startYear: 1835,
        endYear: 1839,
      },
    ],
  };

  it("generates a valid binary PDF resume with %PDF magic bytes", async () => {
    const pdfBuffer = await generateResumePdf(mockContent);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    // Verify PDF Magic Bytes: %PDF (0x25, 0x50, 0x44, 0x46)
    expect(pdfBuffer[0]).toBe(0x25);
    expect(pdfBuffer[1]).toBe(0x50);
    expect(pdfBuffer[2]).toBe(0x44);
    expect(pdfBuffer[3]).toBe(0x46);
  }, 15_000);

  it("generates a valid binary DOCX resume with PK zip magic bytes", async () => {
    const docxBuffer = await generateResumeDocx(mockContent);

    expect(Buffer.isBuffer(docxBuffer)).toBe(true);
    expect(docxBuffer.length).toBeGreaterThan(1000);

    // Verify DOCX / ZIP Magic Bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    expect(docxBuffer[0]).toBe(0x50);
    expect(docxBuffer[1]).toBe(0x4b);
    expect(docxBuffer[2]).toBe(0x03);
    expect(docxBuffer[3]).toBe(0x04);
  });

  it("generates a valid cover letter PDF with %PDF magic bytes", async () => {
    const pdfBuffer = await generateCoverLetterPdf(
      "Ada Lovelace",
      "ada@example.com | +1 555-0100",
      "Dear Hiring Team,\n\nI am writing to express interest in the role.\n\nSincerely,\nAda"
    );

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(500);
    expect(pdfBuffer[0]).toBe(0x25);
    expect(pdfBuffer[1]).toBe(0x50);
    expect(pdfBuffer[2]).toBe(0x44);
    expect(pdfBuffer[3]).toBe(0x46);
  }, 15_000);

  it("generates a valid cover letter DOCX with PK zip magic bytes", async () => {
    const docxBuffer = await generateCoverLetterDocx(
      "Ada Lovelace",
      "ada@example.com | +1 555-0100",
      "Dear Hiring Team,\n\nI am writing to express interest in the role.\n\nSincerely,\nAda"
    );

    expect(Buffer.isBuffer(docxBuffer)).toBe(true);
    expect(docxBuffer.length).toBeGreaterThan(1000);
    expect(docxBuffer[0]).toBe(0x50);
    expect(docxBuffer[1]).toBe(0x4b);
    expect(docxBuffer[2]).toBe(0x03);
    expect(docxBuffer[3]).toBe(0x04);
  });
});
