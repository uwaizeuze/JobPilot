// @vitest-environment node
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import {
  generateJobUploadTemplateCSV,
  parseCSV,
  parseJobSpreadsheet,
} from "@/lib/parsers/job-spreadsheet-parser";

describe("Job Spreadsheet Bulk Upload Parser", () => {
  describe("Template Generation", () => {
    it("generates a CSV template with UTF-8 BOM, required headers, and realistic sample rows", () => {
      const csv = generateJobUploadTemplateCSV();
      expect(csv.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM

      const rows = parseCSV(csv);
      expect(rows.length).toBeGreaterThanOrEqual(4); // 1 header + 3 sample rows

      const header = rows[0];
      expect(header).toContain("Title");
      expect(header).toContain("Company");
      expect(header).toContain("Location");
      expect(header).toContain("Work Mode");
      expect(header).toContain("Employment Type");
      expect(header).toContain("Description");
    });
  });

  describe("CSV Parsing Engine", () => {
    it("handles quoted fields with internal commas, quotes, and newlines", () => {
      const sample = `Title,Company,Description\n"Staff Engineer, Core","Stripe, Inc.","Build scalable APIs, ""high throughput"" systems and queues."`;
      const rows = parseCSV(sample);
      expect(rows.length).toBe(2);
      expect(rows[1][0]).toBe("Staff Engineer, Core");
      expect(rows[1][1]).toBe("Stripe, Inc.");
      expect(rows[1][2]).toBe(
        'Build scalable APIs, "high throughput" systems and queues.'
      );
    });

    it("parses tab-delimited files", () => {
      const tsv = `Title\tCompany\tDescription\nEngineer\tAcme\tThis is a long description of at least twenty characters`;
      const rows = parseCSV(tsv);
      expect(rows.length).toBe(2);
      expect(rows[1][0]).toBe("Engineer");
      expect(rows[1][1]).toBe("Acme");
    });
  });

  describe("parseJobSpreadsheet", () => {
    it("parses valid job listings from CSV text and normalizes fields", async () => {
      const csv = `
Job Title,Company Name,Location,Work Mode,Job Type,Salary Min,Salary Max,Currency,Job URL,Job Description
Senior Cloud Architect,Vercel,Remote,remote,full-time,150000,200000,USD,https://vercel.com/jobs/1,"Architect, scale, and optimize multi-region serverless deployment infrastructure for enterprise customers."
Machine Learning Engineer,OpenAI,"San Francisco, CA",hybrid,full-time,180000,240000,USD,https://openai.com/jobs/2,"Train, evaluate, and deploy frontier models across distributed GPU clusters with high reliability."
`.trim();

      const result = await parseJobSpreadsheet(csv, "jobs.csv");

      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(0);

      const first = result.rows[0];
      expect(first.isValid).toBe(true);
      expect(first.job?.title).toBe("Senior Cloud Architect");
      expect(first.job?.company).toBe("Vercel");
      expect(first.job?.workMode).toBe("remote");
      expect(first.job?.employmentType).toBe("full-time");
      expect(first.job?.salaryRange?.min).toBe(150000);
      expect(first.job?.salaryRange?.max).toBe(200000);
      expect(first.job?.salaryRange?.currency).toBe("USD");
      expect(first.job?.originalUrl).toBe("https://vercel.com/jobs/1");
    });

    it("identifies invalid rows with missing required fields or short descriptions", async () => {
      const csv = `
Title,Company,Description
,Google,"This is a valid long description that exceeds twenty characters."
Staff Engineer,,This description is definitely long enough to pass length requirements.
Frontend Dev,Meta,Too short
`.trim();

      const result = await parseJobSpreadsheet(csv);

      expect(result.summary.total).toBe(3);
      expect(result.summary.valid).toBe(0);
      expect(result.summary.invalid).toBe(3);

      expect(result.rows[0].errors.some((e) => e.includes("title"))).toBe(true);
      expect(result.rows[1].errors.some((e) => e.includes("company"))).toBe(true);
      expect(result.rows[2].errors.some((e) => e.includes("description"))).toBe(true);
    });

    it("parses XLSX workbook zip structures generated with JSZip", async () => {
      const zip = new JSZip();

      // xl/sharedStrings.xml
      const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="6" uniqueCount="6">
  <si><t>Title</t></si>
  <si><t>Company</t></si>
  <si><t>Description</t></si>
  <si><t>Platform Lead</t></si>
  <si><t>Datadog</t></si>
  <si><t>Lead telemetry, distributed observability platforms, and high throughput ingest pipelines.</t></si>
</sst>`;
      zip.file("xl/sharedStrings.xml", sharedStringsXml);

      // xl/worksheets/sheet1.xml
      const sheetXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
      <c r="C1" t="s"><v>2</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>3</v></c>
      <c r="B2" t="s"><v>4</v></c>
      <c r="C2" t="s"><v>5</v></c>
    </row>
  </sheetData>
</worksheet>`;
      zip.file("xl/worksheets/sheet1.xml", sheetXml);

      const buffer = await zip.generateAsync({ type: "nodebuffer" });
      const result = await parseJobSpreadsheet(buffer, "jobs.xlsx");

      expect(result.summary.total).toBe(1);
      expect(result.summary.valid).toBe(1);
      expect(result.rows[0].job?.title).toBe("Platform Lead");
      expect(result.rows[0].job?.company).toBe("Datadog");
      expect(result.rows[0].job?.description).toContain("observability");
    });
  });
});
