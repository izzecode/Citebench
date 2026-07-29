"use client";

import { FileDown } from "lucide-react";
import { buildScreenedDatasetCsv, type Project } from "@/lib/citebench";
import { secondaryButtonClass } from "@/components/app-chrome";

export function ExportDatasetButton({ project }: { project: Project }) {
  function handleExport() {
    const csv = buildScreenedDatasetCsv(project);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-screened.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={handleExport} className={secondaryButtonClass}>
      <FileDown aria-hidden="true" size={16} />
      Export CSV
    </button>
  );
}
