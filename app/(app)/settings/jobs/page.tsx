"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Database,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  RotateCw,
  Server,
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

interface QueueHealthStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
}

interface ScheduleDef {
  name: string;
  queue: string;
  cron: string;
  description: string;
  defaultData: Record<string, unknown>;
}

interface WorkerStatusData {
  isOnline: boolean;
  isWorkerRunning: boolean;
  redisConfigured: boolean;
  queues: QueueHealthStats[];
  totalWaiting: number;
  totalActive: number;
  totalCompleted: number;
  totalFailed: number;
  pendingDbTasksCount: number;
  schedules: ScheduleDef[];
}

interface TaskItem {
  _id: string;
  taskType: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  retryCount: number;
  maxRetries: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function BackgroundJobsPage() {
  const [statusData, setStatusData] = useState<WorkerStatusData | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringTask, setTriggeringTask] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<string | null>(null);

  async function loadData() {
    try {
      const [statusRes, jobsRes] = await Promise.all([
        fetch("/api/worker/status"),
        fetch("/api/worker/jobs?limit=25"),
      ]);

      if (statusRes.ok) {
        const json = await statusRes.json();
        setStatusData(json);
      }

      if (jobsRes.ok) {
        const jobsJson = await jobsRes.json();
        setTasks(jobsJson.tasks || []);
      }
    } catch (err) {
      console.error("Error loading worker data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const [statusRes, jobsRes] = await Promise.all([
          fetch("/api/worker/status"),
          fetch("/api/worker/jobs?limit=25"),
        ]);
        if (!ignore && statusRes.ok) {
          const json = await statusRes.json();
          setStatusData(json);
        }
        if (!ignore && jobsRes.ok) {
          const jobsJson = await jobsRes.json();
          setTasks(jobsJson.tasks || []);
        }
      } catch (err) {
        console.error("Error loading worker status:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleTrigger(taskType: string) {
    try {
      setTriggeringTask(taskType);
      setDispatchMessage(null);
      const res = await fetch("/api/worker/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType }),
      });
      const data = await res.json();
      if (res.ok) {
        setDispatchMessage(`Dispatched '${taskType}' successfully. (${data.result?.message || "Enqueued"})`);
        await loadData();
      } else {
        setDispatchMessage(`Failed to dispatch: ${data.error}`);
      }
    } catch {
      setDispatchMessage("Error dispatching task.");
    } finally {
      setTriggeringTask(null);
    }
  }

  async function handleRetry(taskId: string) {
    try {
      setRetryingId(taskId);
      const res = await fetch(`/api/worker/jobs/${taskId}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Error retrying task:", err);
    } finally {
      setRetryingId(null);
    }
  }

  async function handleSendTestEmail() {
    try {
      setTestEmailLoading(true);
      setTestEmailMessage(null);
      const res = await fetch("/api/notifications/test-email", { method: "POST" });
      const data = await res.json();
      setTestEmailMessage(data.message || (data.sent ? "Email sent!" : "Failed to send email."));
    } catch {
      setTestEmailMessage("Error initiating test email.");
    } finally {
      setTestEmailLoading(false);
    }
  }

  return (
    <PageShell
      title="Background Job Monitor & Queues"
      description="Inspect BullMQ workers, scheduled cron jobs, Redis connectivity, and background task retry history."
    >
      {/* Worker & Redis Health Banner */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${statusData?.isOnline ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">
                  Worker Service:{" "}
                  {statusData?.isOnline ? "Connected & Operational" : "Degraded / Offline Mode"}
                </h4>
                <Badge variant={statusData?.isOnline ? "default" : "outline"} className="text-[11px]">
                  {statusData?.isOnline ? "BullMQ + Redis Online" : "Graceful MongoDB Queue"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
                {statusData?.isOnline
                  ? "BullMQ Redis connection active. Background discovery, qualification matching, and follow-up scans process with exponential backoff."
                  : "Redis is currently offline or unconfigured. In accordance with Section 14, the application remains fully functional: background tasks are safely persisted in MongoDB (AgentTask) awaiting worker reconnection."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metric Counters */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">Waiting in Queue</div>
            <div className="text-2xl font-bold">{statusData?.totalWaiting || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">Active Processing</div>
            <div className="text-2xl font-bold text-primary">{statusData?.totalActive || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">Completed</div>
            <div className="text-2xl font-bold text-emerald-600">{statusData?.totalCompleted || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">Failed / DLQ</div>
            <div className="text-2xl font-bold text-destructive">{statusData?.totalFailed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">Pending in Database</div>
            <div className="text-2xl font-bold text-amber-600">{statusData?.pendingDbTasksCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {dispatchMessage && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs flex items-center justify-between">
          <span>{dispatchMessage}</span>
          <Button variant="ghost" size="sm" onClick={() => setDispatchMessage(null)} className="h-6 text-xs">
            Dismiss
          </Button>
        </div>
      )}

      {/* Grid: Scheduled Tasks & Email Tester */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Scheduled Repeatable Cron Jobs */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Scheduled Background Tasks</CardTitle>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <CardDescription className="text-xs">
                Configured repeatable schedules running automatically in the dedicated BullMQ worker.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border text-xs">
                {(statusData?.schedules || []).map((sch) => (
                  <div key={sch.name} className="flex items-center justify-between p-3.5 hover:bg-muted/30">
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{sch.name}</span>
                        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono">
                          {sch.cron}
                        </code>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        {sch.description}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const taskType = sch.name.replace("maintenance_", "").replace("notification_", "");
                        handleTrigger(taskType);
                      }}
                      disabled={triggeringTask !== null}
                      className="shrink-0 text-xs gap-1 h-7"
                    >
                      {triggeringTask === sch.name ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      Run Now
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outbound Email Testing Card */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Email Delivery Test</CardTitle>
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <CardDescription className="text-xs">
                Verify outbound Resend configuration with an immediate test notification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Provider:</span>
                  <span className="font-medium text-foreground">Resend REST API</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sender:</span>
                  <code className="text-[11px] text-foreground font-mono">
                    {process.env.EMAIL_FROM || "notifications@jobpilot.app"}
                  </code>
                </div>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={handleSendTestEmail}
                disabled={testEmailLoading}
                className="w-full gap-2 text-xs"
              >
                {testEmailLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5" />
                    Send Test Notification
                  </>
                )}
              </Button>

              {testEmailMessage && (
                <p className="text-[11px] text-center text-primary leading-relaxed">
                  {testEmailMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Background Task Execution History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Background Task Execution History</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </div>
          <CardDescription className="text-xs">
            Persistent audit record of background tasks, attempts, and failure inspections from MongoDB.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-xs">Loading task history...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No background tasks recorded yet. Click &quot;Run Now&quot; above to dispatch a test task.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/30 text-muted-foreground font-medium">
                  <tr>
                    <th className="p-3">Task ID</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Retries</th>
                    <th className="p-3">Created</th>
                    <th className="p-3">Completed</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-muted/20">
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {task._id.slice(-6)}
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {task.taskType}
                        {task.error && (
                          <div className="text-[11px] text-destructive mt-0.5 truncate max-w-xs font-mono">
                            {task.error}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            task.status === "completed"
                              ? "default"
                              : task.status === "running"
                              ? "secondary"
                              : task.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-[10px] capitalize"
                        >
                          {task.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {task.retryCount} / {task.maxRetries}
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {new Date(task.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {task.completedAt
                          ? new Date(task.completedAt).toLocaleTimeString()
                          : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {task.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(task._id)}
                            disabled={retryingId === task._id}
                            className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
                          >
                            <RotateCw className={`h-3 w-3 ${retryingId === task._id ? "animate-spin" : ""}`} />
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
