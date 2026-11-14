"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import React, { useRef, useState } from "react";

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
import type { ParsedJobRowResult } from "@/lib/parsers/job-spreadsheet-parser";
import { cn } from "@/lib/utils";

interface ManualJobImportDialogProps {
  onSuccess?: () => void;
  defaultTab?: "single" | "bulk";
  variant?: "single" | "bulk";
}

export function ManualJobImportDialog({
  onSuccess,
  defaultTab = "single",
  variant = "single",
}: ManualJobImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">(defaultTab);

  // Single job form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ message: string; isDuplicate: boolean } | null>(null);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "Remote",
    workMode: "remote" as "remote" | "hybrid" | "onsite",
    employmentType: "full-time" as "full-time" | "part-time" | "contract" | "internship",
    originalUrl: "",
    description: "",
  });

  // Bulk upload state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedJobRowResult[]>([]);
  const [bulkResult, setBulkResult] = useState<{
    total: number;
    valid: number;
    imported: number;
    duplicates: number;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetBulkState() {
    setBulkFile(null);
    setParsedRows([]);
    setBulkError(null);
    setBulkResult(null);
    setParsing(false);
    setBulkImporting(false);
  }

  function handleOpen(tab: "single" | "bulk" = defaultTab) {
    setActiveTab(tab);
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    setError(null);
    setResult(null);
    resetBulkState();
  }

  // --- Single job submission ---
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import job listing.");
      }

      setResult({ message: data.message, isDuplicate: data.isDuplicate });
      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        if (!data.isDuplicate) {
          handleClose();
          setForm({
            title: "",
            company: "",
            location: "Remote",
            workMode: "remote",
            employmentType: "full-time",
            originalUrl: "",
            description: "",
          });
        }
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error importing listing.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // --- Bulk upload handlers ---
  async function handleFileSelect(selectedFile: File) {
    setBulkError(null);
    setBulkResult(null);
    setBulkFile(selectedFile);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("preview", "true");

      const res = await fetch("/api/jobs/import/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse spreadsheet.");
      }

      setParsedRows(data.rows || []);
      if (!data.rows || data.rows.length === 0) {
        setBulkError("Spreadsheet contains no job data rows.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error parsing file.";
      setBulkError(msg);
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  }

  async function handleBulkImport() {
    if (!bulkFile) return;

    setBulkImporting(true);
    setBulkError(null);

    try {
      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("preview", "false");

      const res = await fetch("/api/jobs/import/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import jobs.");
      }

      setBulkResult({
        total: data.summary.total,
        valid: data.summary.valid,
        imported: data.summary.imported,
        duplicates: data.summary.duplicates,
        message: data.message,
      });

      if (onSuccess) {
        onSuccess();
      }

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error importing jobs.";
      setBulkError(msg);
    } finally {
      setBulkImporting(false);
    }
  }

  const validRowCount = parsedRows.filter((r) => r.isValid).length;
  const invalidRowCount = parsedRows.length - validRowCount;

  if (!isOpen) {
    if (variant === "bulk") {
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs h-9"
          onClick={() => handleOpen("bulk")}
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          Bulk Upload (Excel / CSV)
        </Button>
      );
    }

    return (
      <Button onClick={() => handleOpen("single")} className="gap-2 text-xs h-9">
        <Plus className="h-4 w-4" />
        Import Job Listing
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <Card className="w-full max-w-2xl border-border bg-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-3 shrink-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Import Job Listings
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              Add jobs to your workspace manually or bulk-import from an Excel/CSV spreadsheet.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-muted/20 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors",
              activeTab === "single"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Single Job Entry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors",
              activeTab === "bulk"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
            Bulk Upload (Excel / CSV)
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 py-0 px-1">
              .xlsx
            </Badge>
          </button>
        </div>

        {/* Tab 1: Single Job Form */}
        {activeTab === "single" ? (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <CardContent className="space-y-4 p-5 overflow-y-auto flex-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="importTitle" className="text-xs">Job Title</Label>
                  <Input
                    id="importTitle"
                    placeholder="Senior Full-Stack Engineer"
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="importCompany" className="text-xs">Company</Label>
                  <Input
                    id="importCompany"
                    placeholder="Stripe, Figma, Acme..."
                    value={form.company}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, company: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="importLocation" className="text-xs">Location</Label>
                  <Input
                    id="importLocation"
                    placeholder="Remote, San Francisco, CA..."
                    value={form.location}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, location: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="importWorkMode" className="text-xs">Work Mode</Label>
                  <select
                    id="importWorkMode"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.workMode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        workMode: e.target.value as typeof form.workMode,
                      }))
                    }
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="importUrl" className="text-xs">Job Listing URL (Optional)</Label>
                  <Input
                    id="importUrl"
                    type="url"
                    placeholder="https://company.com/jobs/123 or https://linkedin.com/jobs/view/..."
                    value={form.originalUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, originalUrl: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="importDesc" className="text-xs">Job Description (Untrusted Content)</Label>
                  <textarea
                    id="importDesc"
                    rows={5}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Paste the full job description text here..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md p-2.5 text-xs",
                    result.isDuplicate
                      ? "border border-amber-500/40 bg-amber-500/10 text-amber-600"
                      : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{result.message}</span>
                </div>
              )}
            </CardContent>

            <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-5 py-3 shrink-0">
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="gap-2 text-xs">
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Save & Add to Tracker"
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Tab 2: Bulk Upload (Excel / CSV) */
          <div className="flex flex-col flex-1 overflow-hidden">
            <CardContent className="space-y-4 p-5 overflow-y-auto flex-1">
              {/* Template download header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">Excel / CSV Template</p>
                    <p className="text-[11px] text-muted-foreground">
                      Download pre-formatted columns: Title, Company, Location, Work Mode, Salary, URL, Description.
                    </p>
                  </div>
                </div>

                <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs shrink-0 h-8 font-normal">
                  <a href="/api/jobs/import/template" download>
                    <Download className="h-3.5 w-3.5 text-primary" />
                    Download Template
                  </a>
                </Button>
              </div>

              {bulkError && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {bulkResult && (
                <div className="flex items-start gap-2.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">{bulkResult.message}</p>
                    <p className="text-[11px] text-emerald-600/80">
                      Total: {bulkResult.total} • Valid: {bulkResult.valid} • New: {bulkResult.imported} • Refreshed: {bulkResult.duplicates}
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Dropzone */}
              {!bulkResult && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 hover:bg-muted/20"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {parsing ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <p className="text-xs font-medium text-foreground">
                        Parsing spreadsheet rows...
                      </p>
                    </div>
                  ) : bulkFile ? (
                    <div className="space-y-1 flex flex-col items-center">
                      <FileSpreadsheet className="h-7 w-7 text-emerald-500" />
                      <p className="text-xs font-semibold text-foreground">{bulkFile.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(bulkFile.size / 1024).toFixed(1)} KB • Click or drop another file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className="rounded-full bg-primary/10 p-2.5 text-primary">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Click to select or drag & drop an Excel or CSV file
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Parsed Rows Preview */}
              {parsedRows.length > 0 && !bulkResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Spreadsheet Preview ({parsedRows.length} rows found)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        {validRowCount} Ready
                      </Badge>
                      {invalidRowCount > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                          {invalidRowCount} Invalid
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-md border border-border overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border sticky top-0">
                        <tr>
                          <th className="py-1.5 px-2.5 text-left font-medium text-muted-foreground w-10">#</th>
                          <th className="py-1.5 px-2.5 text-left font-medium text-muted-foreground">Title</th>
                          <th className="py-1.5 px-2.5 text-left font-medium text-muted-foreground">Company</th>
                          <th className="py-1.5 px-2.5 text-left font-medium text-muted-foreground">Location</th>
                          <th className="py-1.5 px-2.5 text-left font-medium text-muted-foreground">Mode</th>
                          <th className="py-1.5 px-2.5 text-left font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {parsedRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={row.isValid ? "hover:bg-muted/20" : "bg-destructive/5"}
                          >
                            <td className="py-1.5 px-2.5 font-mono text-[11px] text-muted-foreground">
                              {row.rowNumber}
                            </td>
                            <td className="py-1.5 px-2.5 font-medium text-foreground truncate max-w-[140px]">
                              {row.job?.title || row.raw.title || row.raw.Title || "—"}
                            </td>
                            <td className="py-1.5 px-2.5 text-muted-foreground truncate max-w-[120px]">
                              {row.job?.company || row.raw.company || row.raw.Company || "—"}
                            </td>
                            <td className="py-1.5 px-2.5 text-muted-foreground truncate max-w-[100px]">
                              {row.job?.location || "Remote"}
                            </td>
                            <td className="py-1.5 px-2.5 capitalize text-[11px] text-muted-foreground">
                              {row.job?.workMode || "remote"}
                            </td>
                            <td className="py-1.5 px-2.5">
                              {row.isValid ? (
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                                  Valid
                                </Badge>
                              ) : (
                                <span
                                  className="text-[10px] text-destructive truncate max-w-[120px] block"
                                  title={row.errors.join("; ")}
                                >
                                  {row.errors[0] || "Invalid"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3 shrink-0">
              <Button variant="ghost" size="sm" className="text-xs" onClick={handleClose} disabled={bulkImporting}>
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {bulkFile && (
                  <Button variant="outline" size="sm" className="text-xs" onClick={resetBulkState} disabled={bulkImporting}>
                    Clear File
                  </Button>
                )}

                <Button
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={handleBulkImport}
                  disabled={validRowCount === 0 || bulkImporting || parsing}
                >
                  {bulkImporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Importing {validRowCount} Jobs...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Import {validRowCount} {validRowCount === 1 ? "Job" : "Jobs"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
