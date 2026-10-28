import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type SupportedFileType = "pdf" | "docx";

export interface ParsedDocumentResult {
  text: string;
  fileType: SupportedFileType;
  numPages?: number;
  wordCount: number;
}

export function detectFileTypeFromMagicBytes(buffer: Buffer): SupportedFileType | null {
  if (buffer.length < 4) {
    return null;
  }

  // PDF magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "pdf";
  }

  // DOCX / ZIP magic bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return "docx";
  }

  return null;
}

export function validateFileBuffer(
  buffer: Buffer,
  declaredMimeType?: string
): { valid: boolean; fileType?: SupportedFileType; error?: string } {
  if (buffer.length === 0) {
    return { valid: false, error: "The uploaded file is empty." };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the maximum limit of 5 MB (received ${(
        buffer.length /
        (1024 * 1024)
      ).toFixed(2)} MB).`,
    };
  }

  const detectedType = detectFileTypeFromMagicBytes(buffer);

  if (!detectedType) {
    return {
      valid: false,
      error:
        "Invalid file format. Only legitimate PDF (.pdf) and Microsoft Word (.docx) documents are permitted.",
    };
  }

  if (declaredMimeType) {
    const isPdfMime = declaredMimeType.includes("pdf");
    const isDocxMime =
      declaredMimeType.includes("wordprocessingml") ||
      declaredMimeType.includes("officedocument") ||
      declaredMimeType.includes("msword");

    if (detectedType === "pdf" && !isPdfMime) {
      return {
        valid: false,
        error: "File extension/MIME type does not match actual PDF content.",
      };
    }

    if (detectedType === "docx" && !isDocxMime) {
      return {
        valid: false,
        error: "File extension/MIME type does not match actual DOCX content.",
      };
    }
  }

  return { valid: true, fileType: detectedType };
}

export async function parseDocumentText(
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<ParsedDocumentResult> {
  let rawText = "";
  let numPages: number | undefined;

  if (fileType === "pdf") {
    const data = await pdfParse(buffer);
    rawText = data.text || "";
    numPages = data.numpages;
  } else if (fileType === "docx") {
    const data = await mammoth.extractRawText({ buffer });
    rawText = data.value || "";
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  // Normalize whitespace, line endings, and clean up control characters
  const cleanedText = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const words = cleanedText.split(/\s+/).filter(Boolean);

  return {
    text: cleanedText,
    fileType,
    numPages,
    wordCount: words.length,
  };
}
