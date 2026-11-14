"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

interface UserInfo {
  id?: string;
  name: string;
  email: string;
  role?: string;
}

interface AppHeaderProps {
  onMobileNavToggle?: () => void;
}

function getInitials(name: string): string {
  if (!name) return "JP";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppHeader({ onMobileNavToggle }: AppHeaderProps) {
  const router = useRouter();
  const { addToast } = useUiStore();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user info
  useEffect(() => {
    let ignore = false;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!ignore && res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Unauthenticated or offline
      }
    }
    loadUser();
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch notification count
  useEffect(() => {
    let ignore = false;
    async function loadNotifications() {
      try {
        const res = await fetch("/api/notifications?unreadOnly=true");
        if (!ignore && res.ok) {
          const data = await res.json();
          if (typeof data.unreadCount === "number") {
            setNotifCount(data.unreadCount);
          } else if (Array.isArray(data.notifications)) {
            setNotifCount(data.notifications.length);
          }
        }
      } catch {
        // ignore
      }
    }
    loadNotifications();
    return () => {
      ignore = true;
    };
  }, []);

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Proceed with redirect regardless of network status
    } finally {
      setLoggingOut(false);
      setShowLogoutDialog(false);
      setUser(null);
      addToast({
        title: "Signed out",
        message: "You have been securely signed out of JobPilot.",
        type: "info",
      });
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 md:px-6 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground md:hidden transition-colors"
            onClick={onMobileNavToggle}
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb / Workspace label */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              Workspace &bull;
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>JobPilot AI Engine</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Notifications link */}
          <Link
            href="/notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground transition-all duration-150"
            aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} unread)` : ""}`}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50 duration-200">
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </Link>

          {/* Theme switcher */}
          <ThemeToggle />

          {/* User profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-lg border border-border/70 p-1 pr-2.5 text-sm text-muted-foreground hover:border-border hover:bg-accent/60 transition-all duration-150"
            >
              {/* User Avatar */}
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-xs">
                {user ? getInitials(user.name) : <User className="h-3.5 w-3.5" />}
              </div>

              <div className="hidden text-left sm:block">
                <div className="text-xs font-medium text-foreground max-w-[110px] truncate leading-tight">
                  {user?.name || "Candidate"}
                </div>
              </div>

              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                  dropdownOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                role="menu"
                aria-label="User menu"
                className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-card p-1.5 shadow-xl transition-all animate-in fade-in slide-in-from-top-2 duration-150 z-50"
              >
                {/* User card in dropdown */}
                <div className="border-b border-border/60 px-3 py-2.5 mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.name || "Verified User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email || "candidate@jobpilot.ai"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <Link
                    href="/settings/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    role="menuitem"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Profile & Preferences</span>
                  </Link>

                  <Link
                    href="/settings/privacy"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    role="menuitem"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <span>Privacy & Data</span>
                  </Link>
                </div>

                <div className="border-t border-border/60 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowLogoutDialog(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Confirmation Dialog for Logout */}
      <ConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Sign out of JobPilot?"
        description="Your current active session will be terminated and you will be returned to the sign-in page. Your stored resumes, applications, and settings remain securely saved."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        variant="destructive"
        onConfirm={handleLogout}
        loading={loggingOut}
        icon={<LogOut className="h-5 w-5 text-destructive" />}
      />
    </>
  );
}
