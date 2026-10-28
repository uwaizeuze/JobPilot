import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { AppThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobPilot",
  description:
    "AI job-search and application workspace. Phase 1: project setup, architecture, and UI foundation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <AppThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
