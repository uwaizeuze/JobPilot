"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

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
import type { ProviderCapabilities } from "@/providers/job-source-provider.interface";

interface ProviderInfo {
  name: string;
  capabilities: ProviderCapabilities;
  isConfigured: boolean;
}

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadProviders() {
    try {
      const res = await fetch("/api/jobs/providers");
      if (!res.ok) {
        throw new Error("Failed to load provider registry.");
      }
      const data = await res.json();
      setProviders(data.providers || []);
      setError(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error loading providers.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch("/api/jobs/providers");
        if (!res.ok) {
          throw new Error("Failed to load provider registry.");
        }
        const data = await res.json();
        if (!ignore) {
          setProviders(data.providers || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg =
            err instanceof Error ? err.message : "Error loading providers.";
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
  }, []);

  function handleRefresh() {
    setLoading(true);
    loadProviders();
  }

  return (
    <PageShell
      title="Integrations & Job Sources"
      description="Live status, honest capability flags, and supported application tiers for all job platforms."
    >
      {/* Transparency Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-foreground">
              Honest Platform Architecture & Policy Compliance
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              JobPilot strictly refuses to fabricate fake submissions or run fragile, Terms-of-Service-violating web scrapers. We categorize integrations into three clear tiers:
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div className="rounded border border-border bg-card p-2">
                <span className="font-semibold text-foreground block">
                  1. Auto-Submit Tier
                </span>
                <span className="text-muted-foreground">
                  Direct API dispatch with verified candidate credentials.
                </span>
              </div>
              <div className="rounded border border-border bg-card p-2">
                <span className="font-semibold text-foreground block">
                  2. Prefill-Assisted Tier
                </span>
                <span className="text-muted-foreground">
                  Public ATS API feeds (Greenhouse, Lever) + candidate review.
                </span>
              </div>
              <div className="rounded border border-border bg-card p-2">
                <span className="font-semibold text-foreground block">
                  3. Manual Import Tier
                </span>
                <span className="text-muted-foreground">
                  Candidate pastes job links or descriptions for AI tailoring.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <h3 className="text-sm font-semibold text-foreground">
          Configured Provider Catalog ({providers.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh Status
        </Button>
      </div>

      {loading && providers.length === 0 ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-3 text-xs"
          >
            Retry
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((p) => {
            return (
              <Card
                key={p.name}
                className="flex flex-col justify-between border-border bg-card transition-colors hover:border-primary/40"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">
                        {p.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {p.capabilities.description}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        p.capabilities.tier === "PREFILL_ASSISTED"
                          ? "default"
                          : p.capabilities.tier === "AUTO_SUBMIT"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[10px] shrink-0 font-medium"
                    >
                      {p.capabilities.tier.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0 text-xs">
                  {/* Capabilities indicators */}
                  <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/20 p-2 text-center">
                    <div>
                      <span className="block text-[10px] text-muted-foreground">
                        Discovery
                      </span>
                      <span className="font-semibold">
                        {p.capabilities.discover ? (
                          <span className="text-emerald-500 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground inline-flex items-center gap-0.5">
                            <XCircle className="h-3 w-3" /> No
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-muted-foreground">
                        Prefill
                      </span>
                      <span className="font-semibold">
                        {p.capabilities.prefill ? (
                          <span className="text-emerald-500 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground inline-flex items-center gap-0.5">
                            <XCircle className="h-3 w-3" /> No
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-muted-foreground">
                        Auto-Submit
                      </span>
                      <span className="font-semibold">
                        {p.capabilities.submit ? (
                          <span className="text-emerald-500 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground inline-flex items-center gap-0.5">
                            <XCircle className="h-3 w-3" /> No
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Instructions */}
                  {p.capabilities.connectionInstructions && (
                    <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                      <strong className="text-foreground block mb-0.5 font-medium">
                        How to use:
                      </strong>
                      {p.capabilities.connectionInstructions}
                    </div>
                  )}

                  {/* Status footer */}
                  <div className="flex items-center justify-between border-t border-border pt-3 text-[11px]">
                    <span className="text-muted-foreground">Status:</span>
                    {p.isConfigured ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Live & Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-500">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Manual Candidate Import Only
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
