import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jobpilot.ai";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register"],
        disallow: [
          "/api/",
          "/dashboard",
          "/jobs/",
          "/tracker",
          "/resumes",
          "/interviews",
          "/settings",
          "/notifications",
          "/onboarding",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/login", "/register"],
        disallow: [
          "/api/",
          "/dashboard",
          "/jobs/",
          "/tracker",
          "/resumes",
          "/interviews",
          "/settings",
          "/notifications",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
