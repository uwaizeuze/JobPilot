"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
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
import type { ParsedJobRowResult } from "@/lib/parsers/job-spreadsheet-parser";

interface BulkJobImportDialogProps {
  onSuccess?: () => void;
}

export function BulkJobImportDialog({ onSuccess }: BulkJobImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedJobRowResult[]>([]);
  const [resultSummary, setResultSummary] = useState<{
    total: number;
    valid: number;
    imported: number;
    duplicates: number;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setParsedRows([]);
    setError(null);
    setResultSummary(null);
    setParsing(false);
    setImporting(false);
  }

  function handleClose() {
    setIsOpen(false);
    resetState();
  }

  async function handleFileSelect(selectedFile: File) {
    setError(null);
    setResultSummary(null);
    setFile(selectedFile);
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
      if (data.rows.length === 0) {
        setError("Spreadsheet contains no job data rows.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error parsing file.";
      setError(msg);
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }

  async function handleImport() {
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preview", "false");

      const res = await fetch("/api/jobs/import/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import jobs.");
      }

      setResultSummary({
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
      setError(msg);
    } finally {
      setImporting(false);
    }
  }

  const validRowCount = parsedRows.filter((r) => r.isValid).length;
  const invalidRowCount = parsedRows.length - validRowCount;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs h-9"
        onClick={() => setIsOpen(true)}
      >
        <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
        Bulk Upload (Excel / CSV)
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200">
          <Card className="w-full max-w-3xl border-border bg-card shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between border-b border-border pb-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-semibold">
                    Bulk Upload Job Listings
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    .xlsx / .csv
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Upload an Excel or CSV spreadsheet to import multiple verified jobs at once.
                </CardDescription>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 p-5 overflow-y-auto flex-1">
              {/* Template Download Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/30 p-3.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-medium text-foreground">Need a starting spreadsheet?</p>
                    <p className="text-[11px] text-muted-foreground">
                      Download our pre-formatted template with standard headers: Title, Company, Location, Work Mode, Salary, and Description.
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs shrink-0 h-8 font-normal"
                >
                  <a href="/api/jobs/import/template" download>
                    <Download className="h-3.5 w-3.5 text-primary" />
                    Download Template (.csv)
                  </a>
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Result */}
              {resultSummary && (
                <div className="flex items-start gap-2.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">{resultSummary.message}</p>
                    <p className="text-[11px] text-emerald-600/80">
                      Total: {resultSummary.total} • Valid: {resultSummary.valid} • New: {resultSummary.imported} • Refreshed: {resultSummary.duplicates}
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Dropzone */}
              {!resultSummary && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/80 hover:border-primary/50 hover:bg-muted/20"
                  }`}
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
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-medium text-foreground">
                        Parsing spreadsheet columns...
                      </p>
                    </div>
                  ) : file ? (
                    <div className="space-y-1 flex flex-col items-center">
                      <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                      <p className="text-xs font-semibold text-foreground">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB • Click or drop another file to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className="rounded-full bg-primary/10 p-3 text-primary">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Click to select or drag & drop an Excel or CSV file
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv, .tsv)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Live Preview Table */}
              {parsedRows.length > 0 && !resultSummary && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Spreadsheet Preview ({parsedRows.length} rows found)
                    </span>
                    <div className="flex items-center gap-2">
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

                  <div className="rounded-md border border-border overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 border-b border-border sticky top-0">
                        <tr>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground w-12">#</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground">Job Title</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground">Company</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground">Location</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground">Mode</th>
                          <th className="py-2 px-3 text-left font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {parsedRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={row.isValid ? "hover:bg-muted/20" : "bg-destructive/5"}
                          >
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                              {row.rowNumber}
                            </td>
                            <td className="py-2 px-3 font-medium text-foreground truncate max-w-[180px]">
                              {row.job?.title || row.raw.title || row.raw.Title || "—"}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground truncate max-w-[140px]">
                              {row.job?.company || row.raw.company || row.raw.Company || "—"}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground truncate max-w-[120px]">
                              {row.job?.location || "Remote"}
                            </td>
                            <td className="py-2 px-3 capitalize text-[11px] text-muted-foreground">
                              {row.job?.workMode || "remote"}
                            </td>
                            <td className="py-2 px-3">
                              {row.isValid ? (
                                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                                  Valid
                                </Badge>
                              ) : (
                                <span
                                  className="text-[11px] text-destructive truncate max-w-[160px] block"
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
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleClose}
                disabled={importing}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {file && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={resetState}
                    disabled={importing}
                  >
                    Clear File
                  </Button>
                )}

                <Button
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={handleImport}
                  disabled={validRowCount === 0 || importing || parsing}
                >
                  {importing ? (
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
          </Card>
        </div>
      )}
    </>
  );
}
