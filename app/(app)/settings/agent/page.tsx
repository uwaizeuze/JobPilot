"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  History,
  Key,
  Loader2,
  PauseCircle,
  PlayCircle,
  Save,
  ShieldCheck,
  Trash2,
  Wrench,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AISettingsData {
  isConfigured: boolean;
  keyLastFour: string;
  isUserKey: boolean;
  monthlyTokenBudget: number;
  tokensUsedThisMonth: number;
  maxApplicationsPerDay: number;
  allowedModels: string[];
  consentPolicy: "auto" | "approve";
  globalPause: boolean;
}

export default function AgentSettingsPage() {
  const [data, setData] = useState<AISettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [tokenBudget, setTokenBudget] = useState(200000);
  const [maxApps, setMaxApps] = useState(10);
  const [consentPolicy, setConsentPolicy] = useState<"auto" | "approve">("approve");
  const [globalPause, setGlobalPause] = useState(false);
  const [tools, setTools] = useState<Array<{ name: string; description: string; timeoutMs: number }>>([]);
  const [recentTasks, setRecentTasks] = useState<
    Array<{
      id: string;
      taskType: string;
      status: string;
      createdAt: string;
      completedAt?: string;
      error?: string;
      result?: { tier?: string; status?: string; message?: string; confirmationReference?: string };
    }>
  >([]);

  async function loadSettings() {
    try {
      const [aiRes, toolsRes, statusRes] = await Promise.all([
        fetch("/api/settings/ai"),
        fetch("/api/agent/tools"),
        fetch("/api/agent/status"),
      ]);

      if (aiRes.ok) {
        const json: AISettingsData = await aiRes.json();
        setData(json);
        setTokenBudget(json.monthlyTokenBudget);
        setMaxApps(json.maxApplicationsPerDay);
        setConsentPolicy(json.consentPolicy);
        setGlobalPause(json.globalPause);
      }

      if (toolsRes.ok) {
        const toolsData = await toolsRes.json();
        setTools(toolsData.tools || []);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setRecentTasks(statusData.tasks || []);
      }

      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading settings";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [aiRes, toolsRes, statusRes] = await Promise.all([
          fetch("/api/settings/ai"),
          fetch("/api/agent/tools"),
          fetch("/api/agent/status"),
        ]);

        if (aiRes.ok) {
          const json: AISettingsData = await aiRes.json();
          if (!ignore) {
            setData(json);
            setTokenBudget(json.monthlyTokenBudget);
            setMaxApps(json.maxApplicationsPerDay);
            setConsentPolicy(json.consentPolicy);
            setGlobalPause(json.globalPause);
          }
        }

        if (toolsRes.ok) {
          const toolsData = await toolsRes.json();
          if (!ignore) {
            setTools(toolsData.tools || []);
          }
        }

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (!ignore) {
            setRecentTasks(statusData.tasks || []);
          }
        }

        if (!ignore) setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Error loading settings";
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

  async function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim(),
          monthlyTokenBudget: tokenBudget,
          maxApplicationsPerDay: maxApps,
          consentPolicy,
          globalPause,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to validate API key.");
      }

      setSuccessMessage("API key validated and encrypted successfully.");
      setApiKeyInput("");
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving key";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreferences() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyTokenBudget: tokenBudget,
          maxApplicationsPerDay: maxApps,
          consentPolicy,
          globalPause,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to update preferences.");
      }

      setSuccessMessage("Agent governance policies updated.");
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating preferences";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveKey() {
    if (!confirm("Are you sure you want to remove your stored OpenAI API key?")) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/settings/ai", { method: "DELETE" });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to remove key.");
      }

      setSuccessMessage("API key removed from secure storage.");
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error removing key";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  const budgetUsagePercent = data
    ? Math.min(100, Math.round((data.tokensUsedThisMonth / Math.max(1, data.monthlyTokenBudget)) * 100))
    : 0;

  return (
    <PageShell
      title="AI Agent & Model Settings"
      description="Configure Bring-Your-Own-Key (BYOK) OpenAI credentials, model budgets, and safety limits."
    >
      {/* Security Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Key className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-foreground">
              Zero-Trust Key Storage & Client Isolation
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              API keys are encrypted server-side using <strong>AES-256-GCM</strong> (with a secret master key derived from <code className="text-foreground">KEY_ENCRYPTION_SECRET</code>). Keys are <strong>never</strong> transmitted back to client browsers, logged, or included in client bundles. Only the last 4 characters are retained for verification.
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Key Management Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">OpenAI API Key (BYOK)</CardTitle>
                <Badge
                  variant={data?.isConfigured ? "default" : "outline"}
                  className="text-xs"
                >
                  {data?.isConfigured ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Configured
                    </span>
                  ) : (
                    "Not Configured"
                  )}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Provide your OpenAI key to enable structured job analysis, tailored resumes, and mock interviews.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              {data?.isUserKey ? (
                <div className="rounded-md border border-border bg-muted/20 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Active Encrypted Key:</span>
                    <span className="font-mono font-semibold text-foreground">
                      sk-...{data.keyLastFour}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">
                      Tested & securely stored
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveKey}
                      disabled={saving}
                      className="h-7 text-xs gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove Key
                    </Button>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSaveKey} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="openai-key">
                    {data?.isUserKey ? "Replace API Key" : "Enter OpenAI API Key"}
                  </Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-proj-..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Validated with a live test call to OpenAI before saving.
                  </p>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || !apiKeyInput.trim()}
                  className="w-full gap-2 text-xs"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Validating & Encrypting...
                    </>
                  ) : (
                    <>
                      <Key className="h-3.5 w-3.5" />
                      Validate & Save Key
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Governance & Limits Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Governance & Safety Limits</CardTitle>
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <CardDescription className="text-xs">
                Per-user token budgets and application rate limits to prevent runaway spending.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2 text-xs">
              {/* Token Usage Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Monthly Token Consumption:</span>
                  <span className="font-semibold text-foreground">
                    {data?.tokensUsedThisMonth.toLocaleString()} / {tokenBudget.toLocaleString()} ({budgetUsagePercent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${
                      budgetUsagePercent > 90
                        ? "bg-destructive"
                        : budgetUsagePercent > 70
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${budgetUsagePercent}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="budgetInput" className="text-xs">Monthly Token Budget</Label>
                  <Input
                    id="budgetInput"
                    type="number"
                    min={5000}
                    max={5000000}
                    step={10000}
                    value={tokenBudget}
                    onChange={(e) => setTokenBudget(parseInt(e.target.value, 10) || 50000)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="maxAppsInput" className="text-xs">Max Applications / Day</Label>
                  <Input
                    id="maxAppsInput"
                    type="number"
                    min={1}
                    max={50}
                    value={maxApps}
                    onChange={(e) => setMaxApps(parseInt(e.target.value, 10) || 5)}
                  />
                </div>
              </div>

              {/* Consent Policy */}
              <div className="space-y-1.5 pt-2">
                <Label className="text-xs">Candidate Consent Policy</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={consentPolicy === "approve" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setConsentPolicy("approve")}
                  >
                    Require Approval
                  </Button>
                  <Button
                    type="button"
                    variant={consentPolicy === "auto" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setConsentPolicy("auto")}
                  >
                    Autonomous (Permitted only)
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  &quot;Require Approval&quot; generates a review task before dispatching any submission.
                </p>
              </div>

              {/* Emergency Pause Toggle */}
              <div className="flex items-center justify-between rounded-md border border-border p-2.5">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground block">
                    Global Emergency Pause
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Immediately suspends all autonomous agent tasks and dispatchers.
                  </span>
                </div>
                <Button
                  type="button"
                  variant={globalPause ? "destructive" : "outline"}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => setGlobalPause(!globalPause)}
                >
                  {globalPause ? (
                    <>
                      <PauseCircle className="h-3.5 w-3.5" /> Paused
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-3.5 w-3.5" /> Active
                    </>
                  )}
                </Button>
              </div>

              <Button
                type="button"
                onClick={handleSavePreferences}
                disabled={saving}
                size="sm"
                className="w-full gap-2 text-xs"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Governance Policies
              </Button>
            </CardContent>
          </Card>

          {/* Section: Registered Tools (Section 9.3) */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-primary" />
                    Registered Agent Tools (Section 9.3)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deterministic, sandboxed tools explicitly registered with Zod schemas, server-enforced authentication, and execution timeouts.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {tools.length} Tools Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>
                  The agent has <strong>zero unrestricted OS or browser access</strong>. Model-generated arguments cannot override server-verified user identity, permissions, or system policies.
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 max-h-[340px] overflow-y-auto pr-1">
                {tools.map((tool, idx) => (
                  <div
                    key={tool.name}
                    className="flex flex-col justify-between rounded-md border border-border p-2.5 bg-card hover:bg-muted/30 transition-colors text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-semibold text-primary text-[11px]">
                          #{idx + 1} {tool.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {Math.round(tool.timeoutMs / 1000)}s
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section: Recent Agent Executions */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Recent Autonomous Agent Executions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Audit log of agent application pipeline executions, safety checks, and tier branch outcomes.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {recentTasks.length} Runs
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {recentTasks.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No agent workflows executed yet. Launch a pipeline run using &quot;Apply with AI Agent&quot; on any job preview page.
                </div>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border text-xs">
                  {recentTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 hover:bg-muted/20"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              t.status === "completed"
                                ? "default"
                                : t.status === "failed"
                                ? "destructive"
                                : "outline"
                            }
                            className="text-[10px] uppercase font-mono"
                          >
                            {t.status}
                          </Badge>
                          <span className="font-medium text-foreground">
                            {t.taskType.replace(/_/g, " ")}
                          </span>
                          {t.result?.tier && (
                            <Badge variant="secondary" className="text-[10px]">
                              {t.result.tier}
                            </Badge>
                          )}
                        </div>
                        {t.result?.message && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {t.result.message}
                          </p>
                        )}
                        {t.error && (
                          <p className="text-[11px] text-destructive leading-relaxed">
                            {t.error}
                          </p>
                        )}
                      </div>

                      <div className="text-[11px] text-muted-foreground shrink-0 font-mono">
                        {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
