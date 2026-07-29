"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Gavel,
  GitCompareArrows,
  Play,
  UserPlus,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AppChrome,
  EmptyState,
  PageEyebrow,
  StatCard,
  buttonClass,
  secondaryButtonClass,
} from "@/components/app-chrome";
import { ExportDatasetButton } from "@/components/export-dataset-button";
import { ReviewTeamPanel } from "@/components/review-team-panel";
import {
  calculateStats,
  getScreenableCitations,
} from "@/lib/citebench";
import { useLocalProject } from "@/lib/use-local-project";

export default function ProjectDashboardPage() {
  const params = useParams<{ id: string }>();
  const { project, setProject, loaded, storageMode } = useLocalProject(params.id);

  if (loaded && !project) {
    return (
      <AppChrome>
        <EmptyState
          title="Project not found"
          copy="This project only exists in the browser where it was created."
          action={
            <Link href="/app" className={buttonClass}>
              <ArrowLeft aria-hidden="true" size={16} />
              Back to projects
            </Link>
          }
        />
      </AppChrome>
    );
  }

  if (!project) {
    return (
      <AppChrome>
        <div className="h-1 w-36 animate-pulse bg-[#b9c8c3]" />
      </AppChrome>
    );
  }

  const stats = calculateStats(project);
  const citations = getScreenableCitations(project);
  const recent = citations.slice(0, 6);
  const screeningReady = stats.uniqueCitations > 0;
  const isAdjudicator = project.currentRole === "adjudicator";

  return (
    <AppChrome>
      <Link
        href="/app"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#66736f] hover:text-[#2563eb]"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Projects
      </Link>

      <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <PageEyebrow>Project overview</PageEyebrow>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                screeningReady
                  ? "bg-[#fff3da] text-[#8a5a0c]"
                  : "bg-[#e8f0fb] text-[#355e91]"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  screeningReady ? "bg-[#dfa034]" : "bg-[#5b86c5]"
                }`}
              />
              {screeningReady ? "Screening" : "Setup"}
            </span>
          </div>
          <h1 className="mt-2 max-w-4xl text-3xl font-semibold text-[#17211f] sm:text-4xl">
            {project.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#66736f]">
            {project.researchQuestion || "No research question added yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="#review-team" className={secondaryButtonClass}>
            <UserPlus aria-hidden="true" size={16} />
            {project.screeningMode === "solo"
              ? "Review setup"
              : storageMode === "hosted"
                ? "Invite team"
                : "Review team"}
          </a>
          <Link
            href={
              isAdjudicator
                ? `/app/projects/${project.id}/conflicts`
                : `/app/projects/${project.id}/screen`
            }
            className={buttonClass}
          >
            {isAdjudicator ? (
              <Gavel aria-hidden="true" size={16} />
            ) : (
              <Play aria-hidden="true" size={15} fill="currentColor" />
            )}
            {isAdjudicator
              ? "Open resolution"
              : stats.screened
                ? "Resume screening"
                : "Start screening"}
          </Link>
          <Link
            href={`/app/projects/${project.id}/import`}
            className={secondaryButtonClass}
          >
            <FileUp aria-hidden="true" size={16} />
            Import CSV
          </Link>
          <ExportDatasetButton project={project} />
        </div>
      </div>

      <nav className="mt-7 flex gap-1 overflow-x-auto border-b border-[#d8e0dd]">
        <span className="border-b-2 border-[#2563eb] px-3 py-3 text-sm font-semibold text-[#2563eb]">
          Overview
        </span>
        <Link
          href={`/app/projects/${project.id}/screen`}
          className="px-3 py-3 text-sm font-medium text-[#6a7773] hover:text-[#26322f]"
        >
          Screening
        </Link>
        <Link
          href={`/app/projects/${project.id}/conflicts`}
          className="px-3 py-3 text-sm font-medium text-[#6a7773] hover:text-[#26322f]"
        >
          Resolution
        </Link>
        <Link
          href={`/app/projects/${project.id}/prisma`}
          className="px-3 py-3 text-sm font-medium text-[#6a7773] hover:text-[#26322f]"
        >
          PRISMA
        </Link>
      </nav>

      <section className="grid grid-cols-2 gap-y-5 border-b border-[#dfe5e2] bg-white py-5 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Unique citations" value={stats.uniqueCitations} />
        <StatCard label="Screened" value={`${stats.progress}%`} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Needs review" value={stats.maybes} />
        <StatCard
          label="Included"
          value={stats.included + stats.finalIncluded}
        />
      </section>

      <div className="mt-7">
        <ReviewTeamPanel
          projectId={project.id}
          storageMode={storageMode}
          screeningMode={project.screeningMode}
          onScreeningModeChange={(screeningMode) =>
            setProject({ ...project, screeningMode })
          }
        />
      </div>

      <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border border-[#d8e0dd] bg-white">
          <div className="flex items-center justify-between border-b border-[#e4e9e7] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#17211f]">
                Screening progress
              </h2>
              <p className="mt-1 text-xs text-[#7a8682]">
                Title and abstract stage
              </p>
            </div>
            <span className="text-2xl font-semibold text-[#17211f]">
              {stats.progress}%
            </span>
          </div>
          <div className="p-5">
            <div className="h-2 overflow-hidden rounded-full bg-[#e8edeb]">
              <div
                className="h-full rounded-full bg-[#3ca98d]"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border border-[#e2e8e5] bg-[#e2e8e5]">
              <Metric label="Imported rows" value={project.importSummary?.totalRows ?? 0} />
              <Metric label="Duplicates" value={stats.duplicates} />
              <Metric label="Dropped rows" value={project.importSummary?.dropped ?? 0} />
              <Metric label="Excluded" value={stats.excluded} />
            </div>
          </div>
          <div className="grid gap-2 border-t border-[#e4e9e7] bg-[#fafcfb] p-4 sm:grid-cols-2">
            <Link
              href={`/app/projects/${project.id}/conflicts`}
              className={secondaryButtonClass}
            >
              <GitCompareArrows aria-hidden="true" size={16} />
              Review decisions
            </Link>
            <Link
              href={`/app/projects/${project.id}/prisma`}
              className={secondaryButtonClass}
            >
              <Waypoints aria-hidden="true" size={16} />
              View PRISMA
            </Link>
          </div>
        </div>

        <div className="border border-[#d8e0dd] bg-white">
          <div className="flex items-center justify-between border-b border-[#e4e9e7] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#17211f]">
                Citation activity
              </h2>
              <p className="mt-1 text-xs text-[#7a8682]">
                First records in the current dataset
              </p>
            </div>
            <span className="text-xs font-medium text-[#7a8682]">
              {recent.length} shown
            </span>
          </div>
          {recent.length ? (
            <div className="divide-y divide-[#e8edeb]">
              {recent.map((citation) => {
                const decision = project.decisions[citation.id];
                return (
                  <div
                    key={citation.id}
                    className="grid gap-2 px-5 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#26322f]">
                        {citation.title}
                      </p>
                      <p className="mt-1 text-xs text-[#7a8682]">
                        {citation.year || "Year unknown"} ·{" "}
                        {citation.journal || "Journal unknown"}
                      </p>
                    </div>
                    <DecisionStatus verdict={decision?.verdict} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <FileUp
                aria-hidden="true"
                className="mx-auto text-[#9aaba5]"
                size={24}
              />
              <p className="mt-3 text-sm font-medium text-[#52605c]">
                No citations imported
              </p>
              <Link
                href={`/app/projects/${project.id}/import`}
                className="mt-3 inline-flex text-sm font-semibold text-[#2563eb]"
              >
                Import a CSV
              </Link>
            </div>
          )}
        </div>
      </section>
    </AppChrome>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-xs text-[#7a8682]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#26322f]">{value}</p>
    </div>
  );
}

function DecisionStatus({ verdict }: { verdict?: string }) {
  if (!verdict) {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-[#7a8682]">
        <AlertCircle aria-hidden="true" size={14} />
        Pending
      </span>
    );
  }

  const styles =
    verdict === "include"
      ? "bg-[#ecfdf5] text-[#0f766e]"
      : verdict === "maybe"
        ? "bg-[#fff3da] text-[#8a5a0c]"
        : "bg-[#fff0ec] text-[#a24736]";

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}
    >
      <CheckCircle2 aria-hidden="true" size={13} />
      {verdict}
    </span>
  );
}
