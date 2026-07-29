"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  GitCompareArrows,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AppChrome,
  EmptyState,
  PageEyebrow,
  buttonClass,
  secondaryButtonClass,
} from "@/components/app-chrome";
import {
  calculateStats,
  getNextUnscreenedIndex,
  getScreenableCitations,
  saveDecision,
  type Verdict,
} from "@/lib/citebench";
import { useLocalProject } from "@/lib/use-local-project";

const reasons = [
  "Wrong population",
  "Wrong intervention/exposure",
  "Wrong study type",
  "No relevant outcome",
  "Not primary research",
  "Duplicate or superseded",
  "Unclear from abstract",
];

export default function ScreeningPage() {
  const params = useParams<{ id: string }>();
  const { project, setProject, loaded, saveError } = useLocalProject(params.id);
  const [index, setIndex] = useState(0);
  const [reason, setReason] = useState("");

  const citations = useMemo(
    () => (project ? getScreenableCitations(project) : []),
    [project],
  );
  const citation = citations[index];

  useEffect(() => {
    if (project) {
      const frame = requestAnimationFrame(() => {
        setIndex(getNextUnscreenedIndex(project));
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [project]);

  useEffect(() => {
    if (!project || !citation) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setReason(project.decisions[citation.id]?.reason ?? "");
    });

    return () => cancelAnimationFrame(frame);
  }, [citation, project]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) {
        return;
      }
      if (event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.target instanceof HTMLSelectElement) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(current + 1, citations.length - 1));
      }
      if (event.key === "1") {
        applyDecision("include");
      }
      if (event.key === "2") {
        applyDecision("maybe");
      }
      if (event.key === "3") {
        applyDecision("exclude");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (loaded && !project) {
    return (
      <AppChrome>
        <EmptyState
          title="Project not found"
          copy="This project only exists in the browser where it was created."
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

  if (!citations.length) {
    return (
      <AppChrome>
        <EmptyState
          title="No citations to screen yet"
          copy="Import a CSV first. Duplicate rows will be kept for tracking but excluded from the screening queue."
          action={
            <Link href={`/app/projects/${project.id}/import`} className={buttonClass}>
              Import CSV
            </Link>
          }
        />
      </AppChrome>
    );
  }

  const stats = calculateStats(project);
  const decision = citation ? project.decisions[citation.id] : undefined;

  function applyDecision(verdict: Verdict) {
    if (!project || !citation) {
      return;
    }

    const nextProject = saveDecision(project, citation.id, verdict, reason);
    setProject(nextProject);
    setIndex((current) => Math.min(current + 1, citations.length - 1));
  }

  return (
    <AppChrome>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link
            href={`/app/projects/${project.id}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#66736f] hover:text-[#2563eb]"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Project overview
          </Link>
          <PageEyebrow>Title and abstract screening</PageEyebrow>
          <h1 className="mt-2 truncate text-2xl font-semibold text-[#17211f] sm:text-3xl">
            {project.title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-[#7a8682]">Overall progress</p>
            <p className="mt-1 text-sm font-semibold text-[#26322f]">
              {stats.screened} / {citations.length}
            </p>
          </div>
          <span className="grid size-12 place-items-center rounded-md bg-[#1e3a8a] text-sm font-semibold text-white">
            {stats.progress}%
          </span>
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#dfe6e3]">
        <div
          className="h-full rounded-full bg-[#46b093] transition-[width]"
          style={{ width: `${stats.progress}%` }}
        />
      </div>

      {stats.pending === 0 ? (
        <section
          className="mt-6 flex flex-col gap-5 border border-[#b9dfd4] bg-[#effaf6] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
          role="status"
        >
          <div className="flex min-w-0 gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#0f766e] text-white">
              <CheckCircle2 aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#174f47]">
                Your screening is complete
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#477069]">
                All {citations.length} decisions are saved. Continue to the
                project to invite a co-reviewer or review the results.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={`/app/projects/${project.id}/conflicts`}
              className={secondaryButtonClass}
            >
              <GitCompareArrows aria-hidden="true" size={16} />
              Review decisions
            </Link>
            <Link href={`/app/projects/${project.id}`} className={buttonClass}>
              Continue to project
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </section>
      ) : null}

      {saveError ? (
        <p
          className="mt-5 border border-[#f0c4b8] bg-[#fff4f0] px-3 py-2.5 text-sm font-medium text-[#9a3f2e]"
          role="alert"
        >
          {saveError}
        </p>
      ) : null}

      <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="border border-[#d8e0dd] bg-white shadow-[0_10px_35px_rgba(23,33,31,0.05)]">
          <div className="border-b border-[#e3e9e6] px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-[#6d7975]">
                <FileText aria-hidden="true" size={15} />
                Record {String(index + 1).padStart(3, "0")}
              </div>
              {decision ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    decision.verdict === "include"
                      ? "bg-[#ecfdf5] text-[#0f766e]"
                      : decision.verdict === "maybe"
                        ? "bg-[#fff3da] text-[#8a5a0c]"
                        : "bg-[#fff0ec] text-[#a24736]"
                  }`}
                >
                  Saved as {decision.verdict}
                </span>
              ) : (
                <span className="text-xs font-medium text-[#8b9692]">
                  Awaiting decision
                </span>
              )}
            </div>
          </div>

          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <h2 className="max-w-4xl text-2xl font-semibold leading-9 text-[#17211f]">
              {citation.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#67746f]">
              <span>{citation.authors || "Authors unknown"}</span>
              <span>{citation.year || "Year unknown"}</span>
              <span>{citation.journal || "Journal unknown"}</span>
              {citation.doi ? (
                <span className="font-mono text-xs">{citation.doi}</span>
              ) : null}
            </div>

            <div className="mt-7 border-t border-[#e5eae8] pt-6">
              <h3 className="text-xs font-semibold uppercase text-[#66736f]">
                Abstract
              </h3>
              <p className="mt-3 max-w-4xl text-[15px] leading-7 text-[#34413d]">
                {citation.abstract || "No abstract was provided for this citation."}
              </p>
            </div>

            <label className="mt-7 block max-w-xl">
              <span className="text-sm font-semibold text-[#26322f]">
                Reason or note
              </span>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-[#cbd5d1] bg-white px-3 text-sm outline-none transition focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
              >
                <option value="">No reason selected</option>
                {reasons.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-2 border-t border-[#e3e9e6] bg-[#fafcfb] p-4 sm:grid-cols-3 sm:p-5">
            <button
              onClick={() => applyDecision("include")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white transition hover:bg-[#115e59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5eead4] focus-visible:ring-offset-2"
            >
              <Check aria-hidden="true" size={17} />
              Include
            </button>
            <button
              onClick={() => applyDecision("maybe")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#e6bd6c] bg-[#fff3da] px-4 text-sm font-semibold text-[#7a500d] transition hover:bg-[#fee9bd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e9bd66] focus-visible:ring-offset-2"
            >
              <CircleHelp aria-hidden="true" size={17} />
              Maybe
            </button>
            <button
              onClick={() => applyDecision("exclude")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#e7b7ad] bg-[#fff0ec] px-4 text-sm font-semibold text-[#a24736] transition hover:bg-[#ffe3dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e3a397] focus-visible:ring-offset-2"
            >
              <X aria-hidden="true" size={17} />
              Exclude
            </button>
          </div>
        </article>

        <aside className="h-fit border border-[#d8e0dd] bg-white xl:sticky xl:top-8">
          <div className="border-b border-[#e3e9e6] px-4 py-4">
            <h2 className="text-sm font-semibold text-[#17211f]">Queue</h2>
            <p className="mt-1 text-xs text-[#7a8682]">
              {stats.pending} records remaining
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-px bg-[#e4e9e7]">
            <QueueRow label="Screened" value={stats.screened} tone="green" />
            <QueueRow label="Pending" value={stats.pending} tone="blue" />
            <QueueRow label="Included" value={stats.included} tone="green" />
            <QueueRow label="Maybe" value={stats.maybes} tone="amber" />
            <QueueRow label="Excluded" value={stats.excluded} tone="coral" />
            <QueueRow label="Position" value={index + 1} tone="neutral" />
          </dl>

          <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2 border-t border-[#e3e9e6] p-4">
            <button
              type="button"
              title="Previous citation"
              aria-label="Previous citation"
              onClick={() => setIndex((current) => Math.max(current - 1, 0))}
              className="grid size-10 place-items-center rounded-md border border-[#cbd5d1] bg-white text-[#42504c] transition hover:bg-[#f3f6f5] disabled:opacity-40"
              disabled={index === 0}
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <p className="text-center text-xs font-medium text-[#66736f]">
              {index + 1} of {citations.length}
            </p>
            <button
              type="button"
              title="Next citation"
              aria-label="Next citation"
              onClick={() =>
                setIndex((current) => Math.min(current + 1, citations.length - 1))
              }
              className="grid size-10 place-items-center rounded-md border border-[#cbd5d1] bg-white text-[#42504c] transition hover:bg-[#f3f6f5] disabled:opacity-40"
              disabled={index === citations.length - 1}
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </div>
        </aside>
      </section>
    </AppChrome>
  );
}

function QueueRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "green" | "blue" | "amber" | "coral" | "neutral";
}) {
  const toneClass = {
    green: "text-[#0f766e]",
    blue: "text-[#426d9f]",
    amber: "text-[#936113]",
    coral: "text-[#a24736]",
    neutral: "text-[#45524e]",
  }[tone];

  return (
    <div className="bg-white px-4 py-3">
      <dt className="text-xs text-[#7a8682]">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</dd>
    </div>
  );
}
