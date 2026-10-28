"use client";

import { CheckCircle2, Globe, Loader2, Search, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DiscoverJobsDialogProps {
  onSuccess?: () => void;
}

export function DiscoverJobsDialog({ onSuccess }: DiscoverJobsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const [provider, setProvider] = useState<"greenhouse" | "lever">("greenhouse");
  const [companyToken, setCompanyToken] = useState("");
  const [query, setQuery] = useState("");

  async function handleDiscover(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResultMessage(null);

    try {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          companyToken: companyToken.trim(),
          query: query.trim() || undefined,
          limit: 20,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to discover postings.");
      }

      setResultMessage(data.message || `Discovered ${data.discoveredCount} jobs.`);
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        setIsOpen(false);
        setResultMessage(null);
        setCompanyToken("");
        setQuery("");
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error discovering postings.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
        id="discover-board-button"
      >
        <Globe className="h-4 w-4 text-primary" />
        Discover ATS Boards
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-border bg-card shadow-xl">
        <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Discover ATS Career Boards
            </CardTitle>
            <CardDescription className="mt-1">
              Query verified public API feeds from Greenhouse or Lever without scraping or bot risks.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsOpen(false);
              setError(null);
              setResultMessage(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleDiscover}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={provider === "greenhouse" ? "default" : "outline"}
                  className="w-full justify-start text-xs"
                  onClick={() => setProvider("greenhouse")}
                >
                  Greenhouse Board
                </Button>
                <Button
                  type="button"
                  variant={provider === "lever" ? "default" : "outline"}
                  className="w-full justify-start text-xs"
                  onClick={() => setProvider("lever")}
                >
                  Lever Postings
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="companyToken">
                Employer Board Token / Subdomain
              </Label>
              <Input
                id="companyToken"
                placeholder={
                  provider === "greenhouse"
                    ? "e.g., gitlab, stripe, figma"
                    : "e.g., netflix, spotify, scale"
                }
                value={companyToken}
                onChange={(e) => setCompanyToken(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Found in the company careers URL, e.g. boards.greenhouse.io/
                <span className="font-semibold text-foreground">token</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="searchQuery">Keyword Filter (Optional)</Label>
              <Input
                id="searchQuery"
                placeholder="e.g. Engineer, Frontend, Product"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {error}
              </div>
            )}

            {resultMessage && (
              <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{resultMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-[11px] text-muted-foreground">
                <Badge variant="secondary" className="text-[10px]">
                  Prefill-Assisted Tier
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !companyToken.trim()}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Fetch Postings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
