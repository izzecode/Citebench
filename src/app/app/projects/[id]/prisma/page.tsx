"use client";

import { ArrowLeft, Waypoints } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { useLocalProject } from "@/lib/use-local-project";

export default function PrismaPage() {
  const params = useParams<{ id: string }>();
  const { project, loaded } = useLocalProject(params.id);

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
  const included =
    Object.values(project.finalDecisions).filter(
      (decision) => decision.verdict === "include",
    ).length || stats.included;
  const awaiting = citations.length - stats.screened;

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
          viewBox="0 0 760 720"
          role="img"
          aria-label="PRISMA flow diagram"
          className="mx-auto min-w-[720px] max-w-4xl"
        >
          <PrismaBox x={230} y={20} title="Records identified" value={stats.totalCitations} />
          <Arrow x1={380} y1={100} x2={380} y2={140} />
          <PrismaBox x={230} y={140} title="Duplicates removed" value={stats.duplicates} />
          <Arrow x1={380} y1={220} x2={380} y2={260} />
          <PrismaBox x={230} y={260} title="Records screened" value={stats.uniqueCitations} />
          <Arrow x1={530} y1={315} x2={610} y2={315} />
          <PrismaBox x={610} y={260} title="Records excluded" value={excluded} small />
          <Arrow x1={380} y1={340} x2={380} y2={380} />
          <PrismaBox x={230} y={380} title="Awaiting decision" value={awaiting} />
          <Arrow x1={380} y1={460} x2={380} y2={500} />
          <PrismaBox x={230} y={500} title="Records included" value={included} />
          <text x="380" y="655" textAnchor="middle" className="fill-[#78847f] text-sm">
            Generated locally from Citebench screening data
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
