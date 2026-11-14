"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  Save,
  Sliders,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  eventType: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationPrefs {
  inApp: boolean;
  email: boolean;
  dailyDigest: boolean;
  highMatchThreshold: number;
  events: Record<string, boolean>;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function getEventBorderColor(eventType: string): string {
  switch (eventType) {
    case "high_match_found":
      return "border-l-4 border-l-primary";
    case "submitted":
      return "border-l-4 border-l-blue-500";
    case "interview_scheduled":
      return "border-l-4 border-l-emerald-500";
    case "failed":
      return "border-l-4 border-l-destructive";
    case "follow_up_due":
      return "border-l-4 border-l-amber-500";
    case "integration_disconnected":
      return "border-l-4 border-l-orange-500";
    default:
      return "border-l-4 border-l-muted-foreground/30";
  }
}

function getBadgeVariant(eventType: string) {
  switch (eventType) {
    case "high_match_found":
      return "default";
    case "submitted":
    case "interview_scheduled":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"notifications" | "preferences">("notifications");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<NotificationPrefs>({
    inApp: true,
    email: true,
    dailyDigest: false,
    highMatchThreshold: 80,
    events: {
      high_match_found: true,
      resume_generated: true,
      application_ready_for_review: true,
      submitted: true,
      failed: true,
      interview_scheduled: true,
      follow_up_due: true,
      integration_disconnected: true,
      daily_summary: true,
    },
  });

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const [notifRes, prefsRes] = await Promise.all([
          fetch(`/api/notifications?unreadOnly=${unreadOnly}`),
          fetch("/api/notifications/preferences"),
        ]);
        if (!ignore && notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
        if (!ignore && prefsRes.ok) {
          const data = await prefsRes.json();
          if (data.preferences) setPrefs(data.preferences);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, [unreadOnly]);

  async function markAsRead(id?: string) {
    try {
      if (id) {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } else {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking read:", err);
    }
  }

  async function clearAll() {
    try {
      await fetch("/api/notifications?all=true", { method: "DELETE" });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  }

  async function savePreferences() {
    try {
      setSavingPrefs(true);
      setPrefsMessage(null);
      const res = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        setPrefsMessage("Notification preferences saved successfully.");
      } else {
        setPrefsMessage("Failed to save preferences.");
      }
    } catch {
      setPrefsMessage("Error saving preferences.");
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Notification Center</h1>
        <p className="text-sm text-muted-foreground">
          Stay informed about high-match opportunities, scheduled interview rounds, and autonomous agent actions.
        </p>
      </div>

      {/* Underline Tabs */}
      <div className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex">
            <button
              onClick={() => setActiveTab("notifications")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === "notifications"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Bell className="h-4 w-4" />
              Inbox
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("preferences")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === "preferences"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <Sliders className="h-4 w-4" />
              Preferences &amp; Channels
            </button>
          </div>

          {activeTab === "notifications" && (
            <div className="flex items-center gap-2 pb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={cn("text-xs gap-1.5", unreadOnly && "text-primary")}
              >
                <Filter className="h-3.5 w-3.5" />
                {unreadOnly ? "Showing Unread" : "All Messages"}
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAsRead()}
                  className="text-xs gap-1.5"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === "notifications" ? (
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Loading notification feed...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-14 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <BellOff className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-semibold">All caught up!</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2">
                  High match discoveries, application submissions, and interview reminders will appear here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="mt-5 gap-1.5 text-xs"
                >
                  <Link href="/settings/jobs">
                    Inspect Background Worker Queues
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            notifications.map((item) => (
              <div
                key={item._id}
                className={cn(
                  "rounded-lg border bg-card shadow-xs transition-all",
                  getEventBorderColor(item.eventType),
                  item.read ? "opacity-70" : "shadow-sm"
                )}
              >
                <div className="flex items-start justify-between gap-4 p-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getBadgeVariant(item.eventType)} className="text-[11px] capitalize shrink-0">
                        {item.eventType.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground truncate">
                        {item.title}
                      </span>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-4 pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      {item.link && (
                        <Link
                          href={item.link}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          View Details <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {!item.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(item._id)}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Preferences & Channels Tab */
        <div className="grid gap-6 md:grid-cols-2">
          {/* Channel Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Delivery Channels</CardTitle>
              <CardDescription className="text-xs">
                Select your preferred channels for system updates and scheduled summaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {[
                {
                  key: "inApp" as const,
                  label: "In-App Notification Center",
                  desc: "Display banners and alerts in the navigation bar and inbox.",
                },
                {
                  key: "email" as const,
                  label: "Email Notifications (Resend)",
                  desc: "Receive instant transactional emails for high matches and interviews.",
                },
                {
                  key: "dailyDigest" as const,
                  label: "Daily Pipeline Digest",
                  desc: "Receive a 9:00 AM summary of new matches and upcoming actions.",
                },
              ].map(({ key, label, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                >
                  <div className="space-y-0.5 pr-4">
                    <div className="font-semibold text-foreground text-xs">{label}</div>
                    <div className="text-muted-foreground text-[11px]">{desc}</div>
                  </div>
                  <Toggle
                    checked={prefs[key]}
                    onChange={(v) => setPrefs({ ...prefs, [key]: v })}
                  />
                </div>
              ))}

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <Label htmlFor="thresholdInput" className="text-xs font-semibold">
                    High-Match Alert Threshold
                  </Label>
                  <span className="text-xs font-bold text-primary">
                    {prefs.highMatchThreshold}% Match
                  </span>
                </div>
                <Input
                  id="thresholdInput"
                  type="number"
                  min={50}
                  max={100}
                  step={5}
                  value={prefs.highMatchThreshold}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      highMatchThreshold: parseInt(e.target.value, 10) || 80,
                    })
                  }
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  The background matching worker only dispatches alerts for jobs scoring at or above this threshold.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Event-Specific Toggles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Event Triggers</CardTitle>
              <CardDescription className="text-xs">
                Fine-tune which autonomous agent and tracker events notify you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 text-xs">
              {[
                { key: "high_match_found", label: "High-Match Job Discovered", desc: "When a job matches your profile above threshold" },
                { key: "resume_generated", label: "Tailored Resume Generated", desc: "When the agent drafts a targeted resume" },
                { key: "application_ready_for_review", label: "Application Ready for Review", desc: "When materials are prepared for approval" },
                { key: "submitted", label: "Application Submitted", desc: "When an application is dispatched to an employer" },
                { key: "failed", label: "Submission or Task Failed", desc: "When an automated pipeline encounters an error" },
                { key: "interview_scheduled", label: "Interview Round Scheduled", desc: "When an interview date is set or 24h reminder triggers" },
                { key: "follow_up_due", label: "Follow-Up Due (7+ Days)", desc: "When an applied job has no updates after 7 days" },
                { key: "integration_disconnected", label: "Integration Disconnected", desc: "When an external ATS or job source connection fails" },
                { key: "daily_summary", label: "Daily Summary Digest", desc: "Morning briefing of active applications" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-medium text-foreground">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{desc}</div>
                  </div>
                  <Toggle
                    checked={prefs.events[key] !== false}
                    onChange={(v) =>
                      setPrefs({
                        ...prefs,
                        events: { ...prefs.events, [key]: v },
                      })
                    }
                  />
                </div>
              ))}

              <div className="pt-4">
                <Button
                  onClick={savePreferences}
                  disabled={savingPrefs}
                  size="sm"
                  className="w-full gap-2 text-xs"
                >
                  {savingPrefs ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving Preferences...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Save Notification Preferences
                    </>
                  )}
                </Button>
                {prefsMessage && (
                  <p className="text-[11px] text-center text-primary mt-2">
                    {prefsMessage}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
