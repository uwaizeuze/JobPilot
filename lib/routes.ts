export const MARKETING_ROUTES = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
] as const;

export const APP_ROUTES = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/jobs/preview", label: "Job details" },
  { href: "/jobs/preview/match", label: "Match analysis" },
  { href: "/resumes", label: "Resumes" },
  { href: "/resumes/preview", label: "Resume editor" },
  { href: "/cover-letters/preview", label: "Cover letter" },
  { href: "/tracker", label: "Tracker" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/interviews/calendar", label: "Calendar" },
  { href: "/interviews/prep", label: "Prep packs" },
  { href: "/interviews/mock", label: "Mock interview" },
  { href: "/interviews/history", label: "Interview history" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/agent", label: "AI agent" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/jobs", label: "Background jobs" },
  { href: "/settings/privacy", label: "Privacy" },
] as const;

export const THEME_TEST_ROUTES = [
  ...MARKETING_ROUTES.map((route) => route.href),
  ...APP_ROUTES.map((route) => route.href),
] as const;
