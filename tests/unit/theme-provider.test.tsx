import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach } from "vitest";

import { AppThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { isThemeOption, THEME_OPTIONS, THEME_STORAGE_KEY } from "@/lib/theme";

describe("theme foundation", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("light", "dark");
  });

  it("exposes system as a first-class option and validates stored values", () => {
    expect(THEME_OPTIONS).toEqual(["light", "dark", "system"]);
    expect(isThemeOption("system")).toBe(true);
    expect(isThemeOption("sepia")).toBe(false);
    expect(THEME_STORAGE_KEY).toBe("jobpilot-theme");
  });

  it("persists an explicit theme choice through the provider", async () => {
    const user = userEvent.setup();

    render(
      <AppThemeProvider>
        <ThemeToggle />
      </AppThemeProvider>,
    );

    await user.click(await screen.findByRole("radio", { name: "Dark" }));

    await waitFor(() => {
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    });

    await user.click(screen.getByRole("radio", { name: "Light" }));

    await waitFor(() => {
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    });
  });
});
