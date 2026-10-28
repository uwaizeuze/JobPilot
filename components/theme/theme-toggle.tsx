"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import type { ThemeOption } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: ThemeOption;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-card p-1",
        className,
      )}
      role="radiogroup"
      aria-label="Color theme"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = mounted ? theme === value : value === "system";
        return (
          <Button
            key={value}
            type="button"
            size="sm"
            variant="ghost"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            className={cn(
              "h-8 gap-1.5 px-2.5 text-muted-foreground",
              selected && "bg-accent text-accent-foreground",
            )}
            onClick={() => setTheme(value)}
          >
            <Icon aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
