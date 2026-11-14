import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { AppThemeProvider } from "@/components/theme/theme-provider";
import { ToastContainer } from "@/components/ui/toast";

import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jobpilot.ai";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "JobPilot — Autonomous AI Job Search & Application Agent",
    template: "%s | JobPilot",
  },
  description:
    "JobPilot is the premier autonomous AI-powered job application platform. Auto-match verified jobs, generate ATS-optimized resumes and custom cover letters, track interview pipelines, and accelerate your career.",
  keywords: [
    "JobPilot",
    "AI job application agent",
    "autonomous job hunter",
    "ATS resume builder",
    "AI cover letter generator",
    "job tracker kanban",
    "career automation",
    "interview coach AI",
    "bulk job upload",
    "smart job discovery",
  ],
  authors: [{ name: "JobPilot Team", url: appUrl }],
  creator: "JobPilot",
  publisher: "JobPilot Inc.",
  applicationName: "JobPilot",
  category: "Career & Productivity",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "JobPilot",
    title: "JobPilot — Autonomous AI Job Search & Application Agent",
    description:
      "Automate your job hunt with AI. Intelligent job matching, tailored ATS resumes, personalized cover letters, and full application lifecycle tracking.",
    images: [
      {
        url: "/favicon.svg",
        width: 512,
        height: 512,
        alt: "JobPilot Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "JobPilot — Autonomous AI Job Application Agent",
    description:
      "Automate your job applications with tailored ATS resumes, custom cover letters, and intelligent pipeline tracking.",
    creator: "@jobpilot",
    images: ["/favicon.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "JobPilot",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "description":
        "Autonomous AI job application engine. Match verified postings, generate ATS-tailored resumes and cover letters, and track interview pipelines.",
    },
    {
      "@type": "Organization",
      "name": "JobPilot",
      "url": appUrl,
      "logo": `${appUrl}/favicon.svg`,
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased font-sans"
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.svg" type="image/svg+xml" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <AppThemeProvider>
          <QueryProvider>
            {children}
            <ToastContainer />
          </QueryProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
