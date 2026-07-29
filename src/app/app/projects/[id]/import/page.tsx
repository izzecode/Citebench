"use client";

import {
  ArrowLeft,
  FileSpreadsheet,
  FileUp,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AppChrome,
  EmptyState,
  PageEyebrow,
  buttonClass,
  secondaryButtonClass,
} from "@/components/app-chrome";
import {
  parseCitationCsv,
  sampleCsv,
} from "@/lib/citebench";
import { useLocalProject } from "@/lib/use-local-project";

export default function ImportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { project, setProject, loaded, saveError } = useLocalProject(params.id);
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  if (loaded && !project) {
    return (
      <AppChrome>
        <EmptyState
          title="Project not found"
          copy="Create a project before importing citations."
          action={
            <Link href="/app" className={buttonClass}>
              Back to projects
            </Link>
          }
        />
      </AppChrome>
    );
  }

  if (!project) {
    return <AppChrome>Loading...</AppChrome>;
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setCsvText(await file.text());
  }

  async function handleImport() {
    if (!project) {
      return;
    }

    if (!csvText.trim()) {
      setError("Paste or upload a CSV first.");
      return;
    }

    const result = parseCitationCsv(csvText);

    if (result.summary.totalRows === 0) {
      setError("No citation rows found. Check that the CSV has headers and data.");
      return;
    }

    const nextProject = {
      ...project,
      citations: result.citations,
      decisions: {},
      finalDecisions: {},
      importSummary: result.summary,
      updatedAt: new Date().toISOString(),
    };

    setImporting(true);
    const saved = await setProject(nextProject);
    setImporting(false);

    if (saved) {
      router.push(`/app/projects/${project.id}`);
    }
  }

  const preview = csvText.split(/\r?\n/).slice(0, 6).join("\n");

  return (
    <AppChrome>
      <Link
        href={`/app/projects/${project.id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#66736f] hover:text-[#2563eb]"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Project overview
      </Link>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PageEyebrow>Dataset setup</PageEyebrow>
          <h1 className="mt-2 text-3xl font-semibold text-[#17211f] sm:text-4xl">
            Import citation records
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
            Add a CSV from PubMed, Scopus, or a reference manager. Citebench will
            map common fields and identify duplicate records.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#e8f0fb] px-3 py-1.5 text-xs font-semibold text-[#426d9f]">
          <FileSpreadsheet aria-hidden="true" size={14} />
          CSV format
        </span>
      </div>

      <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="border border-[#d8e0dd] bg-white shadow-[0_8px_30px_rgba(23,33,31,0.04)]">
          <div className="border-b border-[#e3e9e6] px-5 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-[#17211f]">Source data</h2>
            <p className="mt-1 text-xs text-[#7a8682]">
              Upload a file or paste raw CSV text.
            </p>
          </div>
          <div className="p-5 sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold text-[#26322f]">
              Upload CSV
            </span>
            <span className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center border border-dashed border-[#b7c7c1] bg-[#f8faf9] px-4 text-center transition hover:border-[#60a5fa] hover:bg-[#eff6ff]">
              <FileUp aria-hidden="true" className="text-[#3b82f6]" size={22} />
              <span className="mt-2 text-sm font-semibold text-[#1e40af]">
                Choose a CSV file
              </span>
              <span className="mt-1 text-xs text-[#7a8682]">
                One header row followed by citation records
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="sr-only"
              />
            </span>
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-[#26322f]">
              CSV text
            </span>
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={12}
              placeholder="Paste CSV rows here..."
              className="mt-2 w-full rounded-md border border-[#cbd5d1] px-3 py-3 font-mono text-xs leading-6 outline-none transition placeholder:text-[#9aa6a2] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
            />
          </label>

          {error || saveError ? (
            <p className="mt-4 border border-[#f0c4b8] bg-[#fff4f0] px-3 py-2.5 text-sm font-medium text-[#9a3f2e]">
              {error || saveError}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleImport}
              disabled={importing}
              className={buttonClass}
            >
              <FileUp aria-hidden="true" size={16} />
              {importing ? "Importing..." : "Import citations"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCsvText(sampleCsv);
                setError("");
              }}
              className={secondaryButtonClass}
            >
              <Sparkles aria-hidden="true" size={16} />
              Use sample CSV
            </button>
          </div>
          </div>
        </div>

        <aside className="h-fit border border-[#d8e0dd] bg-white xl:sticky xl:top-8">
          <div className="border-b border-[#e3e9e6] px-5 py-4">
            <h2 className="text-sm font-semibold text-[#17211f]">Data preview</h2>
            <p className="mt-1 text-xs text-[#7a8682]">First six rows</p>
          </div>
          {preview ? (
            <pre className="max-h-[440px] overflow-auto bg-[#17211f] p-5 text-xs leading-6 text-[#d9e6e2]">
              {preview}
            </pre>
          ) : (
            <div className="px-5 py-12 text-center">
              <FileSpreadsheet
                aria-hidden="true"
                className="mx-auto text-[#9aaba5]"
                size={24}
              />
              <p className="mt-3 text-sm text-[#66736f]">
                Your data preview will appear here.
              </p>
            </div>
          )}
          <div className="border-t border-[#e3e9e6] bg-[#f7faf9] p-4 text-xs leading-5 text-[#60706b]">
            <strong className="font-semibold text-[#33423e]">Required:</strong>{" "}
            title. Abstract, authors, year, journal, DOI, and source are
            recommended.
          </div>
        </aside>
      </section>
    </AppChrome>
  );
}
