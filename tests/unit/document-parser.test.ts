// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  detectFileTypeFromMagicBytes,
  MAX_FILE_SIZE_BYTES,
  validateFileBuffer,
} from "../../lib/document-parser";

describe("document-parser security and file validation", () => {
  it("correctly identifies PDF files from magic bytes %PDF", () => {
    // 0x25, 0x50, 0x44, 0x46 = %PDF
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const detected = detectFileTypeFromMagicBytes(pdfBuffer);
    expect(detected).toBe("pdf");

    const validation = validateFileBuffer(pdfBuffer, "application/pdf");
    expect(validation.valid).toBe(true);
    expect(validation.fileType).toBe("pdf");
  });

  it("correctly identifies DOCX files from ZIP magic bytes PK\\x03\\x04", () => {
    // 0x50, 0x4B, 0x03, 0x04 = PK\x03\x04
    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const detected = detectFileTypeFromMagicBytes(docxBuffer);
    expect(detected).toBe("docx");

    const validation = validateFileBuffer(
      docxBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(validation.valid).toBe(true);
    expect(validation.fileType).toBe("docx");
  });

  it("rejects files exceeding the 5MB size limit", () => {
    const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
    // write PDF magic header
    oversizedBuffer[0] = 0x25;
    oversizedBuffer[1] = 0x50;
    oversizedBuffer[2] = 0x44;
    oversizedBuffer[3] = 0x46;

    const validation = validateFileBuffer(oversizedBuffer);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("exceeds the maximum limit of 5 MB");
  });

  it("rejects empty buffers and non-document formats (e.g. disguised scripts)", () => {
    const empty = Buffer.alloc(0);
    expect(validateFileBuffer(empty).valid).toBe(false);

    const maliciousScript = Buffer.from("echo 'malicious script'; rm -rf /");
    const validation = validateFileBuffer(maliciousScript, "application/pdf");
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("Invalid file format");
  });

  it("rejects MIME type mismatches (e.g. DOCX buffer declared as PDF)", () => {
    const docxBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const validation = validateFileBuffer(docxBuffer, "application/pdf");
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain("does not match actual DOCX content");
  });
});
