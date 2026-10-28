import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import PDFDocument from "pdfkit";

export interface TailoredResumeContent {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  urls?: {
    portfolio?: string;
    github?: string;
    linkedin?: string;
  };
  headline: string;
  summary: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    responsibilities: string[];
    achievements?: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
  }>;
  projects?: Array<{
    title: string;
    description: string;
    technologies: string[];
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
  }>;
}

/**
 * Generates a clean, ATS-compliant PDF buffer for a tailored resume
 */
export async function generateResumePdf(
  content: TailoredResumeContent
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 40, bottom: 40, left: 45, right: 45 },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      // Header: Candidate Name
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(content.fullName || "Candidate", { align: "center" });

      // Contact Line
      const contactParts = [
        content.email,
        content.phone,
        content.location,
        content.urls?.linkedin,
        content.urls?.github,
      ].filter(Boolean);

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#4B5563")
        .text(contactParts.join(" | "), { align: "center" });

      doc.moveDown(0.8);

      // Headline & Summary Section
      if (content.headline || content.summary) {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor("#111827")
          .text("PROFESSIONAL SUMMARY");

        doc
          .strokeColor("#E5E7EB")
          .lineWidth(1)
          .moveTo(45, doc.y)
          .lineTo(567, doc.y)
          .stroke();

        doc.moveDown(0.3);

        if (content.headline) {
          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor("#1F2937")
            .text(content.headline);
        }

        if (content.summary) {
          doc
            .fontSize(9.5)
            .font("Helvetica")
            .fillColor("#374151")
            .text(content.summary, { lineGap: 2 });
        }

        doc.moveDown(0.8);
      }

      // Technical Skills Section
      if (content.skills && content.skills.length > 0) {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor("#111827")
          .text("CORE COMPETENCIES & TECHNICAL SKILLS");

        doc
          .strokeColor("#E5E7EB")
          .lineWidth(1)
          .moveTo(45, doc.y)
          .lineTo(567, doc.y)
          .stroke();

        doc.moveDown(0.3);

        doc
          .fontSize(9.5)
          .font("Helvetica")
          .fillColor("#374151")
          .text(content.skills.join(" • "), { lineGap: 2 });

        doc.moveDown(0.8);
      }

      // Professional Experience Section
      if (content.experience && content.experience.length > 0) {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor("#111827")
          .text("PROFESSIONAL EXPERIENCE");

        doc
          .strokeColor("#E5E7EB")
          .lineWidth(1)
          .moveTo(45, doc.y)
          .lineTo(567, doc.y)
          .stroke();

        doc.moveDown(0.3);

        for (const exp of content.experience) {
          const dateRange = `${exp.startDate} – ${
            exp.current ? "Present" : exp.endDate || "Present"
          }`;

          doc
            .fontSize(10.5)
            .font("Helvetica-Bold")
            .fillColor("#111827")
            .text(`${exp.title} — ${exp.company}`);

          doc
            .fontSize(8.5)
            .font("Helvetica-Oblique")
            .fillColor("#6B7280")
            .text(`${dateRange}${exp.location ? ` | ${exp.location}` : ""}`);

          doc.moveDown(0.2);

          const bullets = [
            ...(exp.responsibilities || []),
            ...(exp.achievements || []),
          ];

          for (const bullet of bullets) {
            doc
              .fontSize(9)
              .font("Helvetica")
              .fillColor("#374151")
              .text(`• ${bullet}`, { indent: 10, lineGap: 1.5 });
          }

          doc.moveDown(0.5);
        }
      }

      // Education Section
      if (content.education && content.education.length > 0) {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .fillColor("#111827")
          .text("EDUCATION");

        doc
          .strokeColor("#E5E7EB")
          .lineWidth(1)
          .moveTo(45, doc.y)
          .lineTo(567, doc.y)
          .stroke();

        doc.moveDown(0.3);

        for (const edu of content.education) {
          const dateStr =
            edu.endYear || edu.startYear
              ? `${edu.startYear ? `${edu.startYear} – ` : ""}${
                  edu.endYear || ""
                }`
              : "";

          doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor("#111827")
            .text(edu.degree);

          doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor("#4B5563")
            .text(
              `${edu.institution}${
                edu.fieldOfStudy ? ` (${edu.fieldOfStudy})` : ""
              }${dateStr ? ` | ${dateStr}` : ""}`
            );

          doc.moveDown(0.3);
        }
      }

      doc.end();
    } catch (err: unknown) {
      reject(err);
    }
  });
}

/**
 * Generates an ATS-compliant DOCX buffer for a tailored resume
 */
export async function generateResumeDocx(
  content: TailoredResumeContent
): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];

  // Name Header
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: content.fullName || "Candidate",
          bold: true,
          size: 32, // 16pt
        }),
      ],
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    })
  );

  // Contact Info
  const contactParts = [
    content.email,
    content.phone,
    content.location,
    content.urls?.linkedin,
    content.urls?.github,
  ].filter(Boolean);

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: contactParts.join(" | "),
          size: 18,
          color: "666666",
        }),
      ],
      spacing: { after: 250 },
    })
  );

  // Summary
  if (content.summary) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PROFESSIONAL SUMMARY",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: content.summary, size: 20 })],
        spacing: { after: 200 },
      })
    );
  }

  // Skills
  if (content.skills && content.skills.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "CORE COMPETENCIES & TECHNICAL SKILLS",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: content.skills.join(" • "), size: 20 }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PROFESSIONAL EXPERIENCE",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      })
    );

    for (const exp of content.experience) {
      const dateRange = `${exp.startDate} – ${
        exp.current ? "Present" : exp.endDate || "Present"
      }`;

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${exp.title} — ${exp.company}`,
              bold: true,
              size: 21,
            }),
            new TextRun({
              text: `\n${dateRange}${
                exp.location ? ` | ${exp.location}` : ""
              }`,
              italics: true,
              size: 18,
              color: "666666",
            }),
          ],
          spacing: { before: 150, after: 80 },
        })
      );

      const bullets = [
        ...(exp.responsibilities || []),
        ...(exp.achievements || []),
      ];

      for (const bullet of bullets) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: bullet, size: 19 })],
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      }
    }
  }

  // Education
  if (content.education && content.education.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "EDUCATION",
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      })
    );

    for (const edu of content.education) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.degree, bold: true, size: 20 }),
            new TextRun({
              text: ` — ${edu.institution}${
                edu.fieldOfStudy ? ` (${edu.fieldOfStudy})` : ""
              }`,
              size: 20,
            }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/**
 * Generates an ATS-compliant PDF buffer for a tailored cover letter
 */
export async function generateCoverLetterPdf(
  candidateName: string,
  contactLine: string,
  content: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 55, right: 55 },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      // Header
      doc.fontSize(18).font("Helvetica-Bold").text(candidateName);
      if (contactLine) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#4B5563")
          .text(contactLine);
      }

      doc.moveDown(1.5);

      // Date
      doc
        .fontSize(9.5)
        .font("Helvetica")
        .fillColor("#111827")
        .text(
          new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        );

      doc.moveDown(1);

      // Body Paragraphs
      const paragraphs = content.split("\n\n");
      for (const p of paragraphs) {
        const clean = p.trim();
        if (clean) {
          doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("#1F2937")
            .text(clean, { lineGap: 3 });
          doc.moveDown(0.8);
        }
      }

      doc.end();
    } catch (err: unknown) {
      reject(err);
    }
  });
}

/**
 * Generates an ATS-compliant DOCX buffer for a tailored cover letter
 */
export async function generateCoverLetterDocx(
  candidateName: string,
  contactLine: string,
  content: string
): Promise<Buffer> {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({ text: candidateName, bold: true, size: 28 }),
      ],
      spacing: { after: 60 },
    })
  );

  if (contactLine) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: contactLine, size: 18, color: "666666" }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          size: 20,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  const parts = content.split("\n\n");
  for (const p of parts) {
    const clean = p.trim();
    if (clean) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: clean, size: 21 })],
          spacing: { after: 150 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
