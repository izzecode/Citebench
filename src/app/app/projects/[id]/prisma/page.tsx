"use client";

import { ArrowLeft, Waypoints } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppChrome,
  EmptyState,
  PageEyebrow,
  buttonClass,
} from "@/components/app-chrome";
import {
  calculateStats,
  getScreenableCitations,
} from "@/lib/citebench";
import {
  calculateFullTextStats,
  getFullTextEligibleCitations,
  loadHostedFullTextWorkspace,
  type FullTextStats,
} from "@/lib/supabase/full-text";
import { useLocalProject } from "@/lib/use-local-project";

export default function PrismaPage() {
  const params = useParams<{ id: string }>();
  const { project, loaded, storageMode } = useLocalProject(params.id);
  const [fullTextStats, setFullTextStats] = useState<FullTextStats | null>(
    null,
  );

  useEffect(() => {
    if (!project || storageMode !== "hosted") {
      return;
    }

    let cancelled = false;

    void Promise.all([
      getFullTextEligibleCitations(project),
      loadHostedFullTextWorkspace(project.id),
    ])
      .then(([eligible, workspace]) => {
        if (!cancelled && workspace) {
          setFullTextStats(calculateFullTextStats(project, eligible, workspace));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFullTextStats(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project, storageMode]);

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

  const stats = calculateStats(project);
  const citations = getScreenableCitations(project);
  const excluded = Object.values(project.decisions).filter(
    (decision) => decision.verdict === "exclude",
  ).length;
  const titleIncluded =
    Object.values(project.finalDecisions).filter(
      (decision) => decision.verdict === "include",
    ).length || stats.included;
  const awaiting = citations.length - stats.screened;
  const reportsSought = fullTextStats?.eligible ?? titleIncluded;
  const reportsNotRetrieved = fullTextStats?.notRetrieved ?? reportsSought;
  const reportsAssessed = fullTextStats?.documents ?? 0;
  const fullTextsExcluded = fullTextStats?.excluded ?? 0;
  const studiesIncluded = fullTextStats?.included ?? 0;

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
          <PageEyebrow>Reporting</PageEyebrow>
          <h1 className="mt-2 text-3xl font-semibold text-[#17211f] sm:text-4xl">
            PRISMA flow
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
            A live flow diagram generated from the current import and screening
            totals.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#eff6ff] px-3 py-1.5 text-xs font-semibold text-[#2563eb]">
          <Waypoints aria-hidden="true" size={14} />
          Live preview
        </span>
      </div>

      <section className="mt-7 overflow-auto border border-[#d8e0dd] bg-white p-5 shadow-[0_8px_30px_rgba(23,33,31,0.04)]">
        <svg
          viewBox="0 0 800 900"
          role="img"
          aria-label="PRISMA flow diagram"
          className="mx-auto min-w-[720px] max-w-4xl"
        >
          <PrismaBox x={250} y={20} title="Records identified" value={stats.totalCitations} />
          <Arrow x1={400} y1={100} x2={400} y2={140} />
          <PrismaBox x={250} y={140} title="Duplicates removed" value={stats.duplicates} />
          <Arrow x1={400} y1={220} x2={400} y2={260} />
          <PrismaBox x={250} y={260} title="Records screened" value={stats.uniqueCitations} />
          <Arrow x1={550} y1={300} x2={630} y2={300} />
          <PrismaBox x={630} y={260} title="Records excluded" value={excluded} small />
          <Arrow x1={400} y1={340} x2={400} y2={380} />
          <PrismaBox x={250} y={380} title="Reports sought for retrieval" value={reportsSought} />
          <Arrow x1={550} y1={420} x2={630} y2={420} />
          <PrismaBox
            x={630}
            y={380}
            title="Reports not retrieved"
            value={reportsNotRetrieved}
            small
          />
          <Arrow x1={400} y1={460} x2={400} y2={500} />
          <PrismaBox x={250} y={500} title="Reports assessed for eligibility" value={reportsAssessed} />
          <Arrow x1={550} y1={540} x2={630} y2={540} />
          <PrismaBox
            x={630}
            y={500}
            title="Full texts excluded"
            value={fullTextsExcluded}
            small
          />
          <Arrow x1={400} y1={580} x2={400} y2={620} />
          <PrismaBox x={250} y={620} title="Studies included" value={studiesIncluded} />
          <text x="400" y="790" textAnchor="middle" className="fill-[#78847f] text-sm">
            {awaiting
              ? `${awaiting} title and abstract decisions are still pending`
              : "Generated from Citebench title, abstract, and full-text decisions"}
          </text>
        </svg>
      </section>
    </AppChrome>
  );
}

function PrismaBox({
  x,
  y,
  title,
  value,
  small = false,
}: {
  x: number;
  y: number;
  title: string;
  value: number;
  small?: boolean;
}) {
  const width = small ? 130 : 300;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height="80"
        rx="6"
        className="fill-[#f5f8f7] stroke-[#b8c8c2]"
      />
      <text
        x={x + width / 2}
        y={y + 32}
        textAnchor="middle"
        className="fill-[#26322f] text-sm font-semibold"
      >
        {title}
      </text>
      <text
        x={x + width / 2}
        y={y + 58}
        textAnchor="middle"
        className="fill-[#2563eb] text-xl font-semibold"
      >
        {value}
      </text>
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}) {
  return (
    <g className="stroke-[#71807b]">
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="2" />
      <path
        d={`M ${x2 - 6} ${y2 - 8} L ${x2} ${y2} L ${x2 + 6} ${y2 - 8}`}
        fill="none"
        strokeWidth="2"
      />
    </g>
  );
}
