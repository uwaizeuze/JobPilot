import JSZip from "jszip";
import { z } from "zod";

export interface RawJobRow {
  title: string;
  company: string;
  description: string;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  employmentType: "full-time" | "part-time" | "contract" | "internship";
  originalUrl?: string;
  sourcePlatform: string;
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
  };
}

export interface ParsedJobRowResult {
  rowNumber: number;
  raw: Record<string, string>;
  job?: RawJobRow;
  isValid: boolean;
  errors: string[];
}

export interface SpreadsheetParseResult {
  rows: ParsedJobRowResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
  };
}

const JobRowValidationSchema = z.object({
  title: z.string().min(2, "Job title is required (min 2 characters)"),
  company: z.string().min(1, "Company name is required"),
  description: z
    .string()
    .min(20, "Job description must be at least 20 characters long"),
  location: z.string().default("Remote"),
  workMode: z.enum(["remote", "hybrid", "onsite"]).default("remote"),
  employmentType: z
    .enum(["full-time", "part-time", "contract", "internship"])
    .default("full-time"),
  originalUrl: z.string().url("Invalid job URL").optional().or(z.literal("")),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  currency: z.string().default("USD"),
});

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function colLettersToIndex(letters: string): number {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) {
    const code = letters.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      idx = idx * 26 + (code - 64);
    } else if (code >= 97 && code <= 122) {
      idx = idx * 26 + (code - 96);
    }
  }
  return idx - 1;
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  // Strip BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  // Detect delimiter: comma, semicolon, or tab
  const firstLine = cleanText.split(/\r?\n/)[0] || "";
  let delimiter = ",";
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;

  if (tabs > commas && tabs > semicolons) {
    delimiter = "\t";
  } else if (semicolons > commas && semicolons > tabs) {
    delimiter = ";";
  }

  const sanitized = cleanText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    const nextChar = sanitized[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export async function parseXLSX(buffer: Buffer | Uint8Array | ArrayBuffer): Promise<string[][]> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Read shared strings if present
  const sharedStrings: string[] = [];
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  if (sharedStringsFile) {
    const xml = await sharedStringsFile.async("string");
    const siRegex = /<si>([\s\S]*?)<\/si>/g;
    let match: RegExpExecArray | null;
    while ((match = siRegex.exec(xml)) !== null) {
      const siContent = match[1];
      const tMatches = siContent.match(/<t[^>]*>([\s\S]*?)<\/t>/g);
      if (tMatches) {
        const text = tMatches
          .map((t) => t.replace(/<t[^>]*>|<\/t>/g, ""))
          .join("");
        sharedStrings.push(decodeXmlEntities(text));
      } else {
        sharedStrings.push("");
      }
    }
  }

  // 2. Read primary sheet
  let sheetFile = zip.file("xl/worksheets/sheet1.xml");
  if (!sheetFile) {
    const sheetFiles = zip.file(/xl\/worksheets\/sheet.*\.xml/i);
    if (sheetFiles.length > 0) {
      sheetFile = sheetFiles[0];
    }
  }

  if (!sheetFile) {
    return [];
  }

  const sheetXml = await sheetFile.async("string");
  const rows: string[][] = [];

  const rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
    const rowContent = rowMatch[1];
    const cellRegex =
      /<c\s+r="([A-Za-z]+)\d+"(?:\s+[^>]*?t="([a-z]+)")?[^>]*>(?:<v>([\s\S]*?)<\/v>|<is><t>([\s\S]*?)<\/t><\/is>)?<\/c>/g;
    let cellMatch: RegExpExecArray | null;
    const rowData: Record<number, string> = {};
    let maxColIdx = -1;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const colLetters = cellMatch[1];
      const colIdx = colLettersToIndex(colLetters);
      if (colIdx < 0) continue;
      if (colIdx > maxColIdx) maxColIdx = colIdx;

      const type = cellMatch[2];
      const rawValue = cellMatch[3] ?? cellMatch[4] ?? "";

      let val = "";
      if (type === "s") {
        const sIdx = parseInt(rawValue, 10);
        val = sharedStrings[sIdx] || "";
      } else {
        val = decodeXmlEntities(rawValue);
      }
      rowData[colIdx] = val.trim();
    }

    if (maxColIdx >= 0) {
      const fullRow: string[] = [];
      for (let c = 0; c <= maxColIdx; c++) {
        fullRow.push(rowData[c] || "");
      }
      if (fullRow.some((f) => f.length > 0)) {
        rows.push(fullRow);
      }
    }
  }

  return rows;
}

function normalizeHeaderKey(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^(title|jobtitle|role|position)$/.test(clean)) return "title";
  if (/^(company|companyname|employer|org|organization)$/.test(clean)) return "company";
  if (/^(description|jobdescription|desc|details|requirements)$/.test(clean)) return "description";
  if (/^(location|joblocation|city|place)$/.test(clean)) return "location";
  if (/^(workmode|workplace|mode|worklocation)$/.test(clean)) return "workMode";
  if (/^(employmenttype|jobtype|type|contracttype)$/.test(clean)) return "employmentType";
  if (/^(url|joburl|link|postingurl|originalurl|sourceurl)$/.test(clean)) return "originalUrl";
  if (/^(salarymin|minsalary|minimumsalary|salaryfrom)$/.test(clean)) return "salaryMin";
  if (/^(salarymax|maxsalary|maximumsalary|salaryto)$/.test(clean)) return "salaryMax";
  if (/^(currency|salarycurrency)$/.test(clean)) return "currency";
  return clean;
}

function normalizeWorkMode(val?: string): "remote" | "hybrid" | "onsite" {
  if (!val) return "remote";
  const clean = val.toLowerCase().trim();
  if (clean.includes("hybrid")) return "hybrid";
  if (clean.includes("onsite") || clean.includes("on-site") || clean.includes("office")) return "onsite";
  return "remote";
}

function normalizeEmploymentType(
  val?: string
): "full-time" | "part-time" | "contract" | "internship" {
  if (!val) return "full-time";
  const clean = val.toLowerCase().trim();
  if (clean.includes("contract") || clean.includes("freelance") || clean.includes("temp")) return "contract";
  if (clean.includes("part")) return "part-time";
  if (clean.includes("intern")) return "internship";
  return "full-time";
}

function parseSalaryNumber(val?: string): number | undefined {
  if (!val) return undefined;
  const clean = val.replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  return isNaN(num) || num <= 0 ? undefined : num;
}

export async function parseJobSpreadsheet(
  data: Buffer | Uint8Array | string,
  fileName?: string
): Promise<SpreadsheetParseResult> {
  let grid: string[][] = [];

  const isXlsx =
    fileName?.endsWith(".xlsx") ||
    fileName?.endsWith(".xls") ||
    (Buffer.isBuffer(data) && data[0] === 0x50 && data[1] === 0x4b); // PK zip header

  if (isXlsx && typeof data !== "string") {
    try {
      grid = await parseXLSX(data);
    } catch {
      // Fallback to CSV parsing in case of misnamed file
      grid = parseCSV(data.toString("utf-8"));
    }
  } else {
    const text = typeof data === "string" ? data : data.toString("utf-8");
    grid = parseCSV(text);
  }

  if (grid.length < 2) {
    return {
      rows: [],
      summary: { total: 0, valid: 0, invalid: 0 },
    };
  }

  const rawHeaders = grid[0];
  const mappedHeaders = rawHeaders.map(normalizeHeaderKey);

  const results: ParsedJobRowResult[] = [];

  for (let r = 1; r < grid.length; r++) {
    const rowCells = grid[r];
    const rawRecord: Record<string, string> = {};

    for (let c = 0; c < rawHeaders.length; c++) {
      const headerName = rawHeaders[c] || `Column${c + 1}`;
      rawRecord[headerName] = rowCells[c] || "";
    }

    // Map into normalized fields
    let title = "";
    let company = "";
    let description = "";
    let location = "Remote";
    let workModeRaw = "";
    let employmentTypeRaw = "";
    let originalUrl = "";
    let salaryMinRaw = "";
    let salaryMaxRaw = "";
    let currency = "USD";

    for (let c = 0; c < mappedHeaders.length; c++) {
      const key = mappedHeaders[c];
      const val = (rowCells[c] || "").trim();

      switch (key) {
        case "title":
          title = val;
          break;
        case "company":
          company = val;
          break;
        case "description":
          description = val;
          break;
        case "location":
          if (val) location = val;
          break;
        case "workMode":
          workModeRaw = val;
          break;
        case "employmentType":
          employmentTypeRaw = val;
          break;
        case "originalUrl":
          originalUrl = val;
          break;
        case "salaryMin":
          salaryMinRaw = val;
          break;
        case "salaryMax":
          salaryMaxRaw = val;
          break;
        case "currency":
          if (val) currency = val.toUpperCase();
          break;
      }
    }

    const workMode = normalizeWorkMode(workModeRaw);
    const employmentType = normalizeEmploymentType(employmentTypeRaw);
    const salaryMin = parseSalaryNumber(salaryMinRaw);
    const salaryMax = parseSalaryNumber(salaryMaxRaw);

    const parseCandidate = {
      title,
      company,
      description,
      location,
      workMode,
      employmentType,
      originalUrl: originalUrl || undefined,
      salaryMin,
      salaryMax,
      currency,
    };

    const validated = JobRowValidationSchema.safeParse(parseCandidate);

    if (validated.success) {
      const jobData: RawJobRow = {
        title: validated.data.title,
        company: validated.data.company,
        description: validated.data.description,
        location: validated.data.location,
        workMode: validated.data.workMode,
        employmentType: validated.data.employmentType,
        originalUrl: validated.data.originalUrl || undefined,
        sourcePlatform: "Bulk Spreadsheet Upload",
        salaryRange:
          validated.data.salaryMin || validated.data.salaryMax
            ? {
                min: validated.data.salaryMin,
                max: validated.data.salaryMax,
                currency: validated.data.currency,
              }
            : undefined,
      };

      results.push({
        rowNumber: r + 1,
        raw: rawRecord,
        job: jobData,
        isValid: true,
        errors: [],
      });
    } else {
      const fieldErrors = validated.error.flatten().fieldErrors;
      const errorMessages: string[] = [];
      for (const [field, msgs] of Object.entries(fieldErrors)) {
        if (msgs && msgs.length > 0) {
          errorMessages.push(`${field}: ${msgs.join(", ")}`);
        }
      }

      results.push({
        rowNumber: r + 1,
        raw: rawRecord,
        isValid: false,
        errors: errorMessages,
      });
    }
  }

  const validCount = results.filter((r) => r.isValid).length;
  return {
    rows: results,
    summary: {
      total: results.length,
      valid: validCount,
      invalid: results.length - validCount,
    },
  };
}

export function generateJobUploadTemplateCSV(): string {
  const headers = [
    "Title",
    "Company",
    "Location",
    "Work Mode",
    "Employment Type",
    "Salary Min",
    "Salary Max",
    "Currency",
    "Job URL",
    "Description",
  ];

  const sampleRows = [
    [
      "Senior Full-Stack Engineer",
      "Stripe",
      "Remote",
      "remote",
      "full-time",
      "140000",
      "185000",
      "USD",
      "https://stripe.com/jobs/senior-full-stack",
      "We are looking for a Senior Full-Stack Engineer proficient in TypeScript, React, Node.js, and PostgreSQL to design scalable cloud applications.",
    ],
    [
      "Staff AI Platform Engineer",
      "Anthropic",
      "San Francisco, CA",
      "hybrid",
      "full-time",
      "210000",
      "280000",
      "USD",
      "https://anthropic.com/jobs/staff-ai-engineer",
      "Join our core infrastructure team building scalable AI evaluation platforms, high-throughput LLM deployment systems, and autonomous pipelines.",
    ],
    [
      "Frontend Architect",
      "Vercel",
      "Remote",
      "remote",
      "full-time",
      "160000",
      "220000",
      "USD",
      "https://vercel.com/jobs/frontend-architect",
      "Lead next-generation Next.js web applications, champion modern design systems, and optimize rendering pipelines for millions of global users.",
    ],
  ];

  function escapeCSV(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const csvLines = [
    headers.join(","),
    ...sampleRows.map((row) => row.map(escapeCSV).join(",")),
  ];

  // Return with UTF-8 BOM so Excel opens with proper encoding
  return "\uFEFF" + csvLines.join("\r\n") + "\r\n";
}
