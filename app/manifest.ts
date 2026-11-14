import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobPilot — Autonomous AI Job Application Agent",
    short_name: "JobPilot",
    description:
      "JobPilot is your autonomous AI job search workspace. Ingest job postings, generate ATS-tailored resumes and cover letters, and track applications.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
