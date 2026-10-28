"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  Download,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
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

interface AuditLogItem {
  _id: string;
  action: string;
  resource: string;
  ipAddress?: string;
  timestamp: string;
}

export default function PrivacySettingsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Data export state
  const [exporting, setExporting] = useState(false);

  // Retention state
  const [retentionDays, setRetentionDays] = useState(90);
  const [purging, setPurging] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);

  // Account deletion state
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadLogs() {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/user/audit-logs?limit=15");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const res = await fetch("/api/user/audit-logs?limit=15");
        if (!ignore && res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.error("Error loading logs:", err);
      } finally {
        if (!ignore) setLoadingLogs(false);
      }
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleExport() {
    try {
      setExporting(true);
      const res = await fetch("/api/user/export");
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to export data");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jobpilot-user-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Error initiating data export.");
    } finally {
      setExporting(false);
    }
  }

  async function handlePurgeRetention() {
    try {
      setPurging(true);
      setPurgeMessage(null);
      const res = await fetch("/api/user/retention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retentionDays }),
      });
      const data = await res.json();
      if (res.ok) {
        setPurgeMessage(data.message);
        loadLogs();
      } else {
        setPurgeMessage(data.error || "Failed to purge retention data.");
      }
    } catch {
      setPurgeMessage("Error purging historical data.");
    } finally {
      setPurging(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError("You must type DELETE in all uppercase to confirm.");
      return;
    }

    try {
      setDeleting(true);
      setDeleteError(null);
      const res = await fetch("/api/user/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      if (res.ok) {
        router.push("/login?deleted=true");
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete account.");
      }
    } catch {
      setDeleteError("Error executing account deletion.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageShell
      title="Privacy, Security & Data Management"
      description="Manage candidate data sovereignty, portable JSON exports, data retention windows, and immutable audit logs."
    >
      {/* Zero-Trust Architecture Guarantee Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-foreground">
              Candidate Privacy & Zero-Resume-Logging Guarantee
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              In accordance with Section 17, JobPilot enforces strict tenant data isolation. We <strong>never</strong> log raw resume text, passwords, or credentials into audit logs or background worker traces. Your data is yours to export, retain, or permanently delete at any moment.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Data Export Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Portable Data Export</CardTitle>
              <Download className="h-4 w-4 text-primary" />
            </div>
            <CardDescription className="text-xs">
              Download your complete personal dataset across all 16 collections in portable JSON format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              Your export bundle includes: verified professional profile, resumes, tailored versions, cover letters, tracked pipeline applications, mock interview answers, notes, and activity events.
            </p>
            <Button
              onClick={handleExport}
              disabled={exporting}
              size="sm"
              className="w-full gap-2 text-xs"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating Export Bundle...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  Export All My Data (JSON)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Data Retention Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Data Retention Policy</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <CardDescription className="text-xs">
              Configure automatic cleanup policies for historical logs and read notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="retentionSelect" className="text-xs">Historical Cleanup Window</Label>
              <select
                id="retentionSelect"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus:ring-1 focus:ring-ring"
              >
                <option value={30}>30 Days (Strict Minimal Retention)</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days (Recommended Default)</option>
                <option value={180}>180 Days</option>
                <option value={365}>365 Days (1 Year)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Purges security audit records, read notifications, and completed background tasks older than selected period.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePurgeRetention}
              disabled={purging}
              className="w-full gap-2 text-xs mt-2"
            >
              {purging ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Purging Historical Data...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Purge Data Older than {retentionDays} Days
                </>
              )}
            </Button>

            {purgeMessage && (
              <p className="text-[11px] text-primary text-center mt-1">
                {purgeMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security & Audit Trail */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Security & Activity Audit Log</CardTitle>
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <CardDescription className="text-xs">
            Immutable log of authentication events, credential updates, data exports, and emergency actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLogs ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground text-xs">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading security audit trail...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No security events recorded in this audit window.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/30 text-muted-foreground font-medium">
                  <tr>
                    <th className="p-3">Action</th>
                    <th className="p-3">Resource</th>
                    <th className="p-3">Client IP</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-muted/20">
                      <td className="p-3 font-semibold text-foreground">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {log.resource}
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px]">
                        {log.ipAddress || "127.0.0.1"}
                      </td>
                      <td className="p-3 text-muted-foreground text-[11px] text-right">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone: Account Deletion */}
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">Danger Zone — Permanent Account Erasure</CardTitle>
          </div>
          <CardDescription className="text-xs text-destructive/80">
            Irreversible deletion of your user account and all verified profile data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Deleting your account will permanently purge your profile, uploaded resumes, generated documents, tracked applications, interview transcripts, AI credentials, and notifications across all database collections. <strong>This action cannot be undone.</strong>
          </p>

          <div className="space-y-2 max-w-md">
            <Label htmlFor="deleteChallenge" className="text-xs font-semibold">
              Type <code className="bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-mono">DELETE</code> to confirm:
            </Label>
            <Input
              id="deleteChallenge"
              type="text"
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>

          {deleteError && (
            <p className="text-xs text-destructive font-medium">
              {deleteError}
            </p>
          )}

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteAccount}
            disabled={deleting || deleteConfirmText !== "DELETE"}
            className="gap-2 text-xs"
          >
            {deleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Deleting Account...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Permanently Delete My Account & All Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}
