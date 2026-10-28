export const THEME_STORAGE_KEY = "jobpilot-theme";

export const THEME_OPTIONS = ["light", "dark", "system"] as const;

export type ThemeOption = (typeof THEME_OPTIONS)[number];

export function isThemeOption(value: string | null | undefined): value is ThemeOption {
  return value === "light" || value === "dark" || value === "system";
}
