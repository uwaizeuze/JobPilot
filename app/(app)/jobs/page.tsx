"use client";

import {
  ArrowLeft,
  ArrowRight,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DiscoverJobsDialog } from "@/components/jobs/discover-jobs-dialog";
import { JobCard } from "@/components/jobs/job-card";
import { ManualJobImportDialog } from "@/components/jobs/manual-job-import-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IJob } from "@/models/job";

export default function JobsPage() {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [workMode, setWorkMode] = useState<"all" | "remote" | "hybrid" | "onsite">("all");
  const [minMatch, setMinMatch] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
      });

      if (search.trim()) {
        params.set("q", search.trim());
      }

      if (workMode !== "all") {
        params.set("workMode", workMode);
      }

      if (minMatch > 0) {
        params.set("minMatch", minMatch.toString());
      }

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load jobs");
      }

      const data = await res.json();
      setJobs(data.jobs || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching jobs";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, workMode, minMatch]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "12",
        });

        if (search.trim()) {
          params.set("q", search.trim());
        }

        if (workMode !== "all") {
          params.set("workMode", workMode);
        }

        if (minMatch > 0) {
          params.set("minMatch", minMatch.toString());
        }

        const res = await fetch(`/api/jobs?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Failed to load jobs");
        }

        const data = await res.json();
        if (!ignore) {
          setJobs(data.jobs || []);
          setTotalPages(data.totalPages || 1);
          setTotalCount(data.totalCount || 0);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Error fetching jobs";
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
  }, [page, search, workMode, minMatch]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPage(1);
    fetchJobs();
  }

  function handleRefresh() {
    setLoading(true);
    fetchJobs();
  }

  return (
    <PageShell
      title="Job Discovery"
      description="Discover verified postings from ATS career boards or import listings manually from LinkedIn, Indeed, and direct postings."
    >
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-1 items-center gap-2 max-w-lg"
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="job-search"
              placeholder="Search by title, company, or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <DiscoverJobsDialog onSuccess={handleRefresh} />
          <ManualJobImportDialog onSuccess={handleRefresh} />
        </div>
      </div>

      {/* Filter and Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Work Mode:
            </span>
            {(["all", "remote", "hybrid", "onsite"] as const).map((mode) => (
              <Button
                key={mode}
                variant={workMode === mode ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs capitalize"
                onClick={() => {
                  setLoading(true);
                  setWorkMode(mode);
                  setPage(1);
                }}
              >
                {mode}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Match:
            </span>
            {[
              { label: "All", val: 0 },
              { label: "60%+", val: 60 },
              { label: "80%+", val: 80 },
            ].map((m) => (
              <Button
                key={m.label}
                variant={minMatch === m.val ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setLoading(true);
                  setMinMatch(m.val);
                  setPage(1);
                }}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {totalCount} {totalCount === 1 ? "Listing" : "Listings"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={handleRefresh}
            title="Refresh jobs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {loading && jobs.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading job opportunities...</p>
        </div>
      ) : error ? (
        <Card className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
            Try Again
          </Button>
        </Card>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No job listings found"
          description={
            search || workMode !== "all" || minMatch > 0
              ? "No postings match your active filter criteria. Try clearing filters or importing new listings."
              : "Your job pipeline is currently empty. Use 'Discover ATS Boards' to query public boards (Greenhouse/Lever) or 'Import Job Listing' to paste postings from LinkedIn, Indeed, or email."
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={String(job._id)} job={job} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Showing page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className="gap-1 text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className="gap-1 text-xs"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
