"use client";

import {
  ArrowUpRight,
  BookOpenText,
  CircleCheckBig,
  Cloud,
  Clock3,
  Database,
  FileUp,
  Play,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AppChrome,
  EmptyState,
  PageEyebrow,
  StatCard,
  buttonClass,
  secondaryButtonClass,
} from "@/components/app-chrome";
import {
  calculateStats,
  formatDate,
  loadProjects,
  type Project,
} from "@/lib/citebench";
import { loadHostedProjects } from "@/lib/supabase/projects";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageMode, setStorageMode] = useState<"local" | "hosted">("local");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const hostedProjects = await loadHostedProjects();
        if (cancelled) {
          return;
        }

        if (hostedProjects === null) {
          setProjects(loadProjects());
          setStorageMode("local");
        } else {
          setProjects(hostedProjects);
          setStorageMode("hosted");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Projects could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = projects.reduce(
    (acc, project) => {
      const stats = calculateStats(project);
      return {
        projects: acc.projects + 1,
        citations: acc.citations + stats.uniqueCitations,
        screened: acc.screened + stats.screened,
        pending: acc.pending + stats.pending,
      };
    },
    { projects: 0, citations: 0, screened: 0, pending: 0 },
  );

  return (
    <AppChrome>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageEyebrow>Review workspace</PageEyebrow>
          <h1 className="mt-2 text-3xl font-semibold text-[#17211f] sm:text-4xl">
            Projects
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
            Track screening progress, open a queue, or start a new evidence review.
          </p>
        </div>
        <Link href="/app/projects/new" className={buttonClass}>
          <Plus aria-hidden="true" size={17} />
          New project
        </Link>
      </div>

      <section className="mt-7 grid grid-cols-2 gap-y-5 border-y border-[#dfe5e2] bg-white py-5 lg:grid-cols-4">
        <StatCard label="Active projects" value={totals.projects} />
        <StatCard label="Unique citations" value={totals.citations} />
        <StatCard label="Decisions made" value={totals.screened} />
        <StatCard label="Awaiting review" value={totals.pending} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#17211f]">
              Your reviews
            </h2>
            <p className="mt-1 text-xs text-[#7a8682]">
              Most recently created first
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[#74817d]">
            <span className="size-2 rounded-full bg-[#5ac6aa]" />
            {storageMode === "hosted" ? (
              <Cloud aria-hidden="true" size={14} />
            ) : null}
            {storageMode === "hosted" ? "Synced with Supabase" : "Saved locally"}
          </span>
        </div>

        {loadError ? (
          <p
            className="mb-4 border border-[#f0c4b8] bg-[#fff4f0] px-3 py-2.5 text-sm font-medium text-[#9a3f2e]"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {loaded && projects.length === 0 ? (
          <EmptyState
            title="Start your first evidence review"
            copy="Define your review criteria, import a citation CSV, and begin title and abstract screening."
            action={
              <Link href="/app/projects/new" className={buttonClass}>
                <Plus aria-hidden="true" size={17} />
                Create project
              </Link>
            }
          />
        ) : null}

        {projects.length > 0 ? (
          <div className="overflow-hidden border border-[#d8e0dd] bg-white shadow-[0_8px_30px_rgba(23,33,31,0.04)]">
            {projects.map((project) => {
              const stats = calculateStats(project);
              const status = stats.uniqueCitations ? "Screening" : "Setup";

              return (
                <article
                  key={project.id}
                  className="border-b border-[#e5eae8] p-4 last:border-b-0 sm:p-5"
                >
                  <div className="grid gap-5 xl:grid-cols-[minmax(260px,1fr)_150px_190px_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${
                            status === "Screening"
                              ? "bg-[#e7a43b]"
                              : "bg-[#5b86c5]"
                          }`}
                        />
                        <span className="text-xs font-semibold text-[#66736f]">
                          {status}
                        </span>
                      </div>
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="group mt-2 inline-flex max-w-full items-center gap-2"
                      >
                        <h3 className="truncate text-lg font-semibold text-[#17211f] group-hover:text-[#2563eb]">
                          {project.title}
                        </h3>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="shrink-0 text-[#9aa6a2] group-hover:text-[#2563eb]"
                          size={16}
                        />
                      </Link>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#7c8884]">
                        <Clock3 aria-hidden="true" size={13} />
                        Created {formatDate(project.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#7c8884]">Citation set</p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#26322f]">
                        <Database aria-hidden="true" size={15} />
                        {stats.uniqueCitations} unique
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#7c8884]">Screening progress</span>
                        <span className="font-semibold text-[#26322f]">
                          {stats.progress}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8edeb]">
                        <div
                          className="h-full rounded-full bg-[#3ca98d]"
                          style={{ width: `${stats.progress}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-[#7c8884]">
                        {stats.screened} of {stats.uniqueCitations} decided
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {stats.uniqueCitations ? (
                        <Link
                          href={`/app/projects/${project.id}/screen`}
                          className={buttonClass}
                        >
                          <Play aria-hidden="true" size={15} fill="currentColor" />
                          Screen
                        </Link>
                      ) : (
                        <Link
                          href={`/app/projects/${project.id}/import`}
                          className={buttonClass}
                        >
                          <FileUp aria-hidden="true" size={16} />
                          Import
                        </Link>
                      )}
                      <Link
                        href={`/app/projects/${project.id}`}
                        className={secondaryButtonClass}
                      >
                        <BookOpenText aria-hidden="true" size={16} />
                        Overview
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {projects.length > 0 && totals.pending === 0 && totals.citations > 0 ? (
        <div className="mt-5 flex items-center gap-3 border border-[#b9ddcf] bg-[#edf8f4] px-4 py-3 text-sm text-[#205f52]">
          <CircleCheckBig aria-hidden="true" size={18} />
          Every imported citation currently has a screening decision.
        </div>
      ) : null}
    </AppChrome>
  );
}
