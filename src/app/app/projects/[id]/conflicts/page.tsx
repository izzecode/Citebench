"use client";

import {
  ArrowLeft,
  Check,
  CircleCheckBig,
  GitCompareArrows,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  AppChrome,
  EmptyState,
  PageEyebrow,
  buttonClass,
} from "@/components/app-chrome";
import {
  getScreenableCitations,
  saveFinalDecision,
  type Citation,
  type FinalVerdict,
} from "@/lib/citebench";
import { useLocalProject } from "@/lib/use-local-project";

export default function ConflictsPage() {
  const params = useParams<{ id: string }>();
  const { project, setProject, loaded } = useLocalProject(params.id);
  const [rationaleByCitation, setRationaleByCitation] = useState<
    Record<string, string>
  >({});

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

  const citations = getScreenableCitations(project);
  const maybeCitations = citations.filter(
    (citation) =>
      project.decisions[citation.id]?.verdict === "maybe" &&
      !project.finalDecisions[citation.id],
  );
  const resolvedCitations = citations.filter(
    (citation) => project.finalDecisions[citation.id],
  );

  function resolveCitation(
    citation: Citation,
    verdict: FinalVerdict,
    fallback: string,
  ) {
    if (!project) {
      return;
    }

    const rationale = rationaleByCitation[citation.id]?.trim() || fallback;
    setProject(saveFinalDecision(project, citation.id, verdict, rationale));
  }

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
          <PageEyebrow>Decision resolution</PageEyebrow>
          <h1 className="mt-2 text-3xl font-semibold text-[#17211f] sm:text-4xl">
            Resolve uncertain records
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
            Make a final include or exclude decision for records marked Maybe.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#fff3da] px-3 py-1.5 text-xs font-semibold text-[#8a5a0c]">
          <GitCompareArrows aria-hidden="true" size={14} />
          {maybeCitations.length} unresolved
        </div>
      </div>

      <section className="mt-8">
        {maybeCitations.length === 0 ? (
          <EmptyState
            title="No unresolved maybes"
            copy="Maybe decisions will appear here for a final include/exclude call."
            action={
              <Link href={`/app/projects/${project.id}/screen`} className={buttonClass}>
                Continue screening
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {maybeCitations.map((citation) => {
              const decision = project.decisions[citation.id];
              return (
                <article
                  key={citation.id}
                  className="border border-[#d8e0dd] bg-white shadow-[0_8px_25px_rgba(23,33,31,0.04)]"
                >
                  <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="p-5 sm:p-6">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3da] px-2.5 py-1 text-xs font-semibold text-[#8a5a0c]">
                        Maybe
                      </span>
                      <h2 className="mt-4 text-lg font-semibold text-[#17211f]">
                        {citation.title}
                      </h2>
                      {decision?.reason ? (
                        <p className="mt-2 text-xs font-medium text-[#936113]">
                          Reason: {decision.reason}
                        </p>
                      ) : null}
                      <p className="mt-4 line-clamp-5 text-sm leading-7 text-[#495651]">
                        {citation.abstract ||
                          "No abstract was provided for this citation."}
                      </p>
                    </div>

                    <div className="border-t border-[#e3e9e6] bg-[#f8faf9] p-5 lg:border-l lg:border-t-0">
                      <label className="block">
                        <span className="text-sm font-semibold text-[#26322f]">
                          Final rationale
                        </span>
                        <textarea
                          value={rationaleByCitation[citation.id] ?? ""}
                          onChange={(event) =>
                            setRationaleByCitation((current) => ({
                              ...current,
                              [citation.id]: event.target.value,
                            }))
                          }
                          rows={4}
                          placeholder="Why is this included or excluded?"
                          className="mt-2 w-full rounded-md border border-[#cbd5d1] bg-white px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-[#9aa6a2] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
                        />
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <button
                          onClick={() =>
                            resolveCitation(citation, "include", "Resolved as include.")
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f766e] text-sm font-semibold text-white transition hover:bg-[#115e59]"
                        >
                          <Check aria-hidden="true" size={16} />
                          Include
                        </button>
                        <button
                          onClick={() =>
                            resolveCitation(citation, "exclude", "Resolved as exclude.")
                          }
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#e7b7ad] bg-[#fff0ec] text-sm font-semibold text-[#a24736] transition hover:bg-[#ffe3dc]"
                        >
                          <X aria-hidden="true" size={16} />
                          Exclude
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {resolvedCitations.length ? (
        <section className="mt-8 border border-[#d8e0dd] bg-white">
          <div className="flex items-center gap-2 border-b border-[#e3e9e6] px-5 py-4">
            <CircleCheckBig aria-hidden="true" className="text-[#0f766e]" size={18} />
            <h2 className="text-sm font-semibold text-[#17211f]">
              Final decisions
            </h2>
          </div>
          <div className="divide-y divide-[#e6ebe9]">
            {resolvedCitations.map((citation) => {
              const finalDecision = project.finalDecisions[citation.id];
              return (
                <div key={citation.id} className="px-5 py-3.5 text-sm">
                  <p className="font-medium text-[#26322f]">{citation.title}</p>
                  <p className="mt-1 capitalize text-[#66736f]">
                    {finalDecision.verdict} · {finalDecision.rationale}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </AppChrome>
  );
}
