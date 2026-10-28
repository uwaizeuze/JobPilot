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
import { PageShell } from "@/components/layout/page-shell";
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

  return (
    <PageShell
      title="Notification Center"
      description="Stay informed about high-match opportunities, scheduled interview rounds, and autonomous agent actions."
    >
      {/* Tabs */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "notifications" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("notifications")}
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            Inbox
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "preferences" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("preferences")}
            className="gap-2"
          >
            <Sliders className="h-4 w-4" />
            Preferences & Channels
          </Button>
        </div>

        {activeTab === "notifications" && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUnreadOnly(!unreadOnly)}
              className="text-xs gap-1.5"
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

      {activeTab === "notifications" ? (
        <div className="space-y-3 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Loading notification feed...</p>
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <BellOff className="h-10 w-10 text-muted-foreground/60 mb-3" />
                <h3 className="text-base font-semibold">No notifications right now</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  You are all caught up! High match discoveries, application submissions, and interview reminders will appear here.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="mt-4 gap-1.5 text-xs"
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
              <Card
                key={item._id}
                className={`transition-colors ${
                  item.read ? "bg-card/60 opacity-80" : "border-primary/40 bg-card shadow-xs"
                }`}
              >
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getBadgeVariant(item.eventType)} className="text-[11px] capitalize">
                        {item.eventType.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {item.title}
                      </span>
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
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
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Preferences & Channels Tab */
        <div className="grid gap-6 md:grid-cols-2 pt-2">
          {/* Channel Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Delivery Channels</CardTitle>
              <CardDescription className="text-xs">
                Select your preferred channels for system updates and scheduled summaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">In-App Notification Center</div>
                  <div className="text-muted-foreground text-[11px]">
                    Display banners and alerts in the navigation bar and inbox.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.inApp}
                  onChange={(e) => setPrefs({ ...prefs, inApp: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">Email Notifications (Resend)</div>
                  <div className="text-muted-foreground text-[11px]">
                    Receive instant transactional emails for high matches and interviews.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.email}
                  onChange={(e) => setPrefs({ ...prefs, email: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">Daily Pipeline Digest</div>
                  <div className="text-muted-foreground text-[11px]">
                    Receive a 9:00 AM summary of new matches and upcoming actions.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.dailyDigest}
                  onChange={(e) => setPrefs({ ...prefs, dailyDigest: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
              </div>

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
            <CardContent className="space-y-3 text-xs">
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
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div className="space-y-0.5">
                    <div className="font-medium text-foreground">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.events[key] !== false}
                    onChange={(e) =>
                      setPrefs({
                        ...prefs,
                        events: { ...prefs.events, [key]: e.target.checked },
                      })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary shrink-0 ml-2"
                  />
                </div>
              ))}

              <div className="pt-3">
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
    </PageShell>
  );
}
