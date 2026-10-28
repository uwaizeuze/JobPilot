"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  MapPin,
  Play,
  Plus,
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

interface InterviewEvent {
  _id: string;
  interviewDate?: string;
  status: string;
  jobId: {
    _id: string;
    title: string;
    company: string;
    location: string;
    workMode: string;
  };
  notes?: string;
  recruiterContact?: {
    name?: string;
    email?: string;
  };
}

export default function InterviewCalendarPage() {
  const [events, setEvents] = useState<InterviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [candidateApps, setCandidateApps] = useState<
    Array<{ _id: string; jobId: { title: string; company: string } }>
  >([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCalendarEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/interviews/calendar");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  async function openScheduleDialog() {
    setScheduleModalOpen(true);
    try {
      const res = await fetch("/api/applications?limit=50");
      if (res.ok) {
        const data = await res.json();
        const apps = (data.applications || []).filter(
          (a: { jobId: unknown }) => a.jobId && typeof a.jobId === "object"
        );
        setCandidateApps(apps);
        if (apps.length > 0) setSelectedAppId(apps[0]._id);
      }
    } catch {
      // Offline fallback
    }
  }

  async function handleScheduleSubmit() {
    if (!selectedAppId || !selectedDate || saving) return;

    try {
      setSaving(true);
      const res = await fetch("/api/interviews/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedAppId,
          interviewDate: selectedDate,
        }),
      });

      if (res.ok) {
        setScheduleModalOpen(false);
        fetchCalendarEvents();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Interview Calendar"
      description="Track upcoming rounds, access tailored prep packs, and launch targeted mock sessions."
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold">Scheduled Rounds ({events.length})</h3>
            <p className="text-xs text-muted-foreground">
              Automatically creates tailored prep packs and reminders upon scheduling.
            </p>
          </div>

          <Button
            size="sm"
            onClick={openScheduleDialog}
            className="gap-1.5 text-xs shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Schedule Interview
          </Button>
        </div>

        {/* Schedule Modal */}
        {scheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
            <Card className="w-full max-w-md shadow-lg border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Schedule Interview Round
                </CardTitle>
                <CardDescription className="text-xs">
                  Links this interview to your tracked application and generates a tailored prep pack.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Target Application</label>
                  {candidateApps.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No tracked applications found. Please apply or track a role first.
                    </p>
                  ) : (
                    <select
                      value={selectedAppId}
                      onChange={(e) => setSelectedAppId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background p-2 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                    >
                      {candidateApps.map((app) => (
                        <option key={app._id} value={app._id}>
                          {app.jobId.company} — {app.jobId.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="font-semibold block mb-1">Date and Time</label>
                  <input
                    type="datetime-local"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2 text-xs shadow-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </CardContent>
              <div className="border-t p-4 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setScheduleModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleScheduleSubmit}
                  disabled={saving || !selectedAppId || !selectedDate}
                  className="text-xs"
                >
                  {saving ? "Scheduling..." : "Confirm & Generate Prep Pack"}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Events Agenda List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading interview calendar...
          </div>
        ) : events.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent className="space-y-3">
              <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-semibold">No Upcoming Interviews Scheduled</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                When an application enters the interview stage or you set an interview date, it will appear here with tailored prep links.
              </p>
              <Button size="sm" variant="outline" onClick={openScheduleDialog} className="text-xs">
                Schedule an Interview Round
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((ev) => {
              const job = ev.jobId;
              const dateStr = ev.interviewDate
                ? new Date(ev.interviewDate).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Date to be confirmed";

              return (
                <Card key={ev._id} className="transition-all hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-primary/10 text-primary border-primary/20 mb-2"
                        >
                          {ev.status}
                        </Badge>
                        <CardTitle className="text-base font-bold leading-tight">
                          {job?.title || "Target Role"}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5 font-medium text-foreground">
                          {job?.company || "Company"}
                        </CardDescription>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-primary block">
                          {dateStr}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {job?.location || "Remote"} ({job?.workMode || "Flexible"})
                      </span>
                      {ev.recruiterContact?.name && (
                        <span>Recruiter: {ev.recruiterContact.name}</span>
                      )}
                    </div>
                  </CardContent>
                  <div className="border-t p-3 bg-muted/20 flex items-center justify-between gap-2">
                    <Button asChild size="sm" variant="outline" className="text-xs gap-1.5 h-8">
                      <Link href={`/interviews/prep?jobId=${job?._id}`}>
                        <BookOpen className="h-3.5 w-3.5" />
                        Prep Pack
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="text-xs gap-1.5 h-8">
                      <Link href={`/interviews/mock?jobId=${job?._id}`}>
                        <Play className="h-3.5 w-3.5" />
                        Practice Mock
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
