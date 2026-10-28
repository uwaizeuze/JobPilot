"use client";

import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  Grid,
  List,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApplicationDetailDialog } from "@/components/tracker/application-detail-dialog";
import { StatusBadge } from "@/components/tracker/status-badge";
import { getStatusCategory, type TrackerCategory } from "@/services/application-state-machine";
import type { ApplicationStatus, IApplication } from "@/models/application";
import type { IJob } from "@/models/job";

type ApplicationWithJob = IApplication & { jobId: IJob };

interface ColumnDefinition {
  id: TrackerCategory;
  title: string;
  statuses: ApplicationStatus[];
}

const KANBAN_COLUMNS: ColumnDefinition[] = [
  {
    id: "SAVED",
    title: "Saved & Discovered",
    statuses: ["DISCOVERED", "ANALYZING", "SHORTLISTED", "NOT_QUALIFIED"],
  },
  {
    id: "PREPARING",
    title: "In Preparation",
    statuses: ["PREPARING", "READY_FOR_REVIEW", "AWAITING_APPROVAL"],
  },
  {
    id: "APPLIED",
    title: "Applied",
    statuses: ["SUBMITTING", "APPLIED"],
  },
  {
    id: "INTERVIEW",
    title: "Interviews",
    statuses: ["ASSESSMENT", "INTERVIEW"],
  },
  {
    id: "OUTCOME",
    title: "Decisions & Closed",
    statuses: ["OFFER", "REJECTED", "WITHDRAWN", "FAILED", "CANCELLED"],
  },
];

export default function TrackerPage() {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Selected application for detail modal
  const [activeApp, setActiveApp] = useState<ApplicationWithJob | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchApplications() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedStatus && selectedStatus !== "ALL") {
        params.set("status", selectedStatus);
      }
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await fetch(`/api/applications?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load tracked applications.");
      }

      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading applications";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const params = new URLSearchParams();
        if (selectedStatus && selectedStatus !== "ALL") {
          params.set("status", selectedStatus);
        }
        if (search.trim()) {
          params.set("search", search.trim());
        }

        const res = await fetch(`/api/applications?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load tracked applications.");
        }

        const data = await res.json();
        if (!ignore) {
          setApplications(data.applications || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Error loading applications";
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [selectedStatus, search]);

  function handleOpenDetail(app: ApplicationWithJob) {
    setActiveApp(app);
    setDialogOpen(true);
  }

  // Filtered applications by local search (if typing without hitting Enter)
  const filteredApps = applications.filter((app) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const title = (app.jobId?.title || "").toLowerCase();
    const company = (app.jobId?.company || "").toLowerCase();
    return title.includes(q) || company.includes(q);
  });

  // Calculate statistics
  const totalCount = applications.length;
  const preparingCount = applications.filter(
    (a) => getStatusCategory(a.status) === "PREPARING"
  ).length;
  const appliedCount = applications.filter(
    (a) => getStatusCategory(a.status) === "APPLIED"
  ).length;
  const interviewCount = applications.filter(
    (a) => getStatusCategory(a.status) === "INTERVIEW"
  ).length;
  const offerCount = applications.filter((a) => a.status === "OFFER").length;

  return (
    <PageShell
      title="Application Tracker"
      description="Visual pipeline and state machine tracking your applications from discovery to offer."
    >
      <div className="space-y-6">
        {/* Metric Summary Counters */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card className="p-3 text-center bg-card/60">
            <div className="text-xl font-bold text-foreground">{totalCount}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Total Tracked
            </div>
          </Card>
          <Card className="p-3 text-center bg-card/60">
            <div className="text-xl font-bold text-blue-500">{preparingCount}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Preparing
            </div>
          </Card>
          <Card className="p-3 text-center bg-card/60">
            <div className="text-xl font-bold text-emerald-500">{appliedCount}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Applied
            </div>
          </Card>
          <Card className="p-3 text-center bg-card/60">
            <div className="text-xl font-bold text-purple-500">{interviewCount}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Interviews
            </div>
          </Card>
          <Card className="p-3 text-center bg-card/60 col-span-2 sm:col-span-1">
            <div className="text-xl font-bold text-green-600">{offerCount}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Offers
            </div>
          </Card>
        </div>

        {/* Filter & View Switcher Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company or job title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchApplications()}
                className="pl-9 text-xs"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="DISCOVERED">Discovered</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY_FOR_REVIEW">Ready for Review</option>
              <option value="APPLIED">Applied</option>
              <option value="INTERVIEW">Interview</option>
              <option value="OFFER">Offer</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchApplications}
              disabled={loading}
              className="text-xs h-9"
              title="Refresh applications"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-md border border-input bg-muted/40 p-0.5">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("kanban")}
                className="h-8 px-2.5 text-xs gap-1.5"
              >
                <Grid className="h-3.5 w-3.5" />
                Kanban
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-2.5 text-xs gap-1.5"
              >
                <List className="h-3.5 w-3.5" />
                Table
              </Button>
            </div>

            <Link href="/jobs">
              <Button size="sm" className="gap-1.5 text-xs h-9">
                <Plus className="h-3.5 w-3.5" />
                Add from Discovery
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Content Area */}
        {loading && applications.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading application pipeline...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <Card className="p-12 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <CardTitle className="mt-3 text-base font-semibold">
              No applications tracked yet
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              Track job postings from the Job Discovery catalog to tailor resumes, generate cover
              letters, and advance through interview stages.
            </p>
            <div className="mt-4">
              <Link href="/jobs">
                <Button size="sm" className="gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  Explore Discovered Jobs
                </Button>
              </Link>
            </div>
          </Card>
        ) : viewMode === "kanban" ? (
          /* Kanban Board View */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5 items-start">
            {KANBAN_COLUMNS.map((col) => {
              const colApps = filteredApps.filter((a) =>
                col.statuses.includes(a.status)
              );

              return (
                <div
                  key={col.id}
                  className="rounded-lg border border-border/80 bg-muted/20 flex flex-col min-h-[480px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between border-b border-border/70 p-3 bg-muted/40 rounded-t-lg">
                    <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      {col.title}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {colApps.length}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[700px]">
                    {colApps.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded border border-dashed border-border/60 text-[11px] text-muted-foreground">
                        Empty column
                      </div>
                    ) : (
                      colApps.map((app) => (
                        <Card
                          key={String(app._id)}
                          onClick={() => handleOpenDetail(app)}
                          className="cursor-pointer border-border bg-card p-3 shadow-sm transition hover:border-primary/50 hover:shadow-md space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="font-semibold text-xs text-foreground line-clamp-1">
                              {app.jobId?.title || "Target Role"}
                            </h4>
                            <StatusBadge status={app.status} className="text-[10px] px-1.5 py-0" />
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                            <Building2 className="h-3 w-3 text-primary shrink-0" />
                            <span className="line-clamp-1">{app.jobId?.company || "Company"}</span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" />
                              {app.jobId?.workMode || "remote"}
                            </span>
                            {app.interviewDate ? (
                              <span className="text-purple-500 font-medium flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" />
                                {new Date(app.interviewDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span>{new Date(app.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Pipeline Table View */
          <Card className="border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Job Title & Company</TableHead>
                  <TableHead className="text-xs">Location & Mode</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Key Dates</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => (
                  <TableRow
                    key={String(app._id)}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => handleOpenDetail(app)}
                  >
                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">
                        {app.jobId?.title || "Target Role"}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <Building2 className="h-3 w-3 text-primary" />
                        {app.jobId?.company}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      <div>{app.jobId?.location || "Remote"}</div>
                      <div className="text-[10px] uppercase font-medium">{app.jobId?.workMode}</div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <StatusBadge status={app.status} />
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground uppercase text-[11px]">
                      {app.submissionMethod}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {app.interviewDate ? (
                        <div className="text-purple-500 font-medium">
                          Int: {new Date(app.interviewDate).toLocaleDateString()}
                        </div>
                      ) : app.appliedDate ? (
                        <div>Applied: {new Date(app.appliedDate).toLocaleDateString()}</div>
                      ) : (
                        <div>Updated: {new Date(app.updatedAt).toLocaleDateString()}</div>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                        View
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Application Detail Dialog */}
        <ApplicationDetailDialog
          application={activeApp}
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onUpdated={() => {
            fetchApplications();
            // Also refresh activeApp if it is open
            if (activeApp) {
              fetch(`/api/applications/${activeApp._id}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.application) setActiveApp(d.application);
                })
                .catch(() => {});
            }
          }}
        />
      </div>
    </PageShell>
  );
}
