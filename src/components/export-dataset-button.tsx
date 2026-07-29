"use client";

import { FileDown, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { buildScreenedDatasetCsv, type Project } from "@/lib/citebench";
import { secondaryButtonClass } from "@/components/app-chrome";
import { buildHostedReviewDatasetCsv } from "@/lib/supabase/full-text";

export function ExportDatasetButton({
  project,
  storageMode,
}: {
  project: Project;
  storageMode: "local" | "hosted";
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setExporting(true);
    setError("");

    try {
      const csv =
        storageMode === "hosted"
          ? await buildHostedReviewDatasetCsv(project)
          : buildScreenedDatasetCsv(project);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-screened.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "The export could not be prepared.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={exporting}
        onClick={() => void handleExport()}
        className={secondaryButtonClass}
      >
        {exporting ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <FileDown aria-hidden="true" size={16} />
        )}
        {exporting ? "Preparing..." : "Export CSV"}
      </button>
      {error ? (
        <p className="mt-1 max-w-56 text-xs text-[#9a3f2e]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
