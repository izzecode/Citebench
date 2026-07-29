"use client";

import {
  ArrowLeft,
  Check,
  CircleCheckBig,
  Clock3,
  GitCompareArrows,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
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
  getScreenableCitations,
  saveFinalDecision,
  type Citation,
  type FinalVerdict,
  type ReviewerRole,
  type ScreeningMode,
  type Verdict,
} from "@/lib/citebench";
import {
  loadHostedReviewerDecisions,
  type HostedReviewerDecision,
} from "@/lib/supabase/projects";
import { useLocalProject } from "@/lib/use-local-project";

export default function ConflictsPage() {
  const params = useParams<{ id: string }>();
  const {
    project,
    setProject,
    loaded,
    storageMode,
    saveError,
  } = useLocalProject(params.id);
  const [hostedDecisions, setHostedDecisions] = useState<
    HostedReviewerDecision[]
  >([]);
  const [matrixLoaded, setMatrixLoaded] = useState(false);
  const [matrixError, setMatrixError] = useState("");
  const [rationaleByCitation, setRationaleByCitation] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!project || storageMode !== "hosted") {
      return;
    }

    let cancelled = false;

    void loadHostedReviewerDecisions(project.id)
      .then((decisions) => {
        if (!cancelled) {
          setHostedDecisions(decisions ?? []);
          setMatrixLoaded(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMatrixError(
            error instanceof Error
              ? error.message
              : "Reviewer decisions could not be compared.",
          );
          setMatrixLoaded(true);
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

  const effectiveMode: ScreeningMode =
    storageMode === "local" ? "solo" : project.screeningMode;
  const decisions =
    storageMode === "hosted"
      ? hostedDecisions
      : Object.values(project.decisions).map(
          (decision): HostedReviewerDecision => ({
            citationId: decision.citationId,
            reviewerId: "local-owner",
            reviewerEmail: "Local reviewer",
            reviewerRole: "owner",
            verdict: decision.verdict,
            reason: decision.reason,
            decidedAt: decision.decidedAt,
          }),
        );
  const citations = getScreenableCitations(project);
  const votesByCitation = groupVotes(decisions);
  const expectedPrimaryVotes = effectiveMode === "solo" ? 1 : 2;
  const unresolvedCitations = citations.filter((citation) => {
    if (project.finalDecisions[citation.id]) {
      return false;
    }

    const votes = votesByCitation.get(citation.id) ?? [];
    return requiresResolution(votes, expectedPrimaryVotes);
  });
  const awaitingComparison = citations.filter((citation) => {
    if (project.finalDecisions[citation.id]) {
      return false;
    }
    return (votesByCitation.get(citation.id)?.length ?? 0) < expectedPrimaryVotes;
  }).length;
  const resolvedCitations = citations.filter(
    (citation) => project.finalDecisions[citation.id],
  );
  const canResolve =
    project.currentRole === "owner" || project.currentRole === "adjudicator";
  const matrixReady = storageMode === "local" || matrixLoaded;

  function resolveCitation(
    citation: Citation,
    verdict: FinalVerdict,
    fallback: string,
  ) {
    if (!project || !canResolve) {
      return;
    }

    const rationale = rationaleByCitation[citation.id]?.trim() || fallback;
    void setProject(
      saveFinalDecision(project, citation.id, verdict, rationale),
    );
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
            Resolve reviewer decisions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
            {resolutionDescription(effectiveMode)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#fff3da] px-3 py-1.5 text-xs font-semibold text-[#8a5a0c]">
            <GitCompareArrows aria-hidden="true" size={14} />
            {unresolvedCitations.length} unresolved
          </span>
          {effectiveMode !== "solo" && awaitingComparison ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f0fb] px-3 py-1.5 text-xs font-semibold text-[#355e91]">
              <Clock3 aria-hidden="true" size={14} />
              {awaitingComparison} awaiting both votes
            </span>
          ) : null}
        </div>
      </div>

      {matrixError || saveError ? (
        <p
          className="mt-5 border border-[#f0c4b8] bg-[#fff4f0] px-3 py-2.5 text-sm font-medium text-[#9a3f2e]"
          role="alert"
        >
          {matrixError || saveError}
        </p>
      ) : null}

      <section className="mt-8">
        {!matrixReady ? (
          <div className="flex items-center gap-2 border border-[#d8e0dd] bg-white px-5 py-8 text-sm text-[#66736f]">
            <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
            Comparing reviewer decisions
          </div>
        ) : unresolvedCitations.length === 0 ? (
          <EmptyState
            title={
              awaitingComparison
                ? "Waiting for independent decisions"
                : "No decisions need resolution"
            }
            copy={
              awaitingComparison
                ? `${awaitingComparison} citations still need all required primary-reviewer votes before comparison.`
                : "Matching reviewer decisions are accepted automatically. New disagreements or Maybe votes will appear here."
            }
            action={
              project.currentRole === "adjudicator" ? (
                <Link href={`/app/projects/${project.id}`} className={buttonClass}>
                  Back to project
                </Link>
              ) : (
                <Link
                  href={`/app/projects/${project.id}/screen`}
                  className={buttonClass}
                >
                  Continue screening
                </Link>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {unresolvedCitations.map((citation) => {
              const votes = votesByCitation.get(citation.id) ?? [];

              return (
                <article
                  key={citation.id}
                  className="border border-[#d8e0dd] bg-white shadow-[0_8px_25px_rgba(23,33,31,0.04)]"
                >
                  <div className="grid xl:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="p-5 sm:p-6">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3da] px-2.5 py-1 text-xs font-semibold text-[#8a5a0c]">
                        <GitCompareArrows aria-hidden="true" size={13} />
                        {conflictLabel(votes)}
                      </span>
                      <h2 className="mt-4 text-lg font-semibold text-[#17211f]">
                        {citation.title}
                      </h2>
                      <p className="mt-4 line-clamp-5 text-sm leading-7 text-[#495651]">
                        {citation.abstract ||
                          "No abstract was provided for this citation."}
                      </p>

                      <div className="mt-5 grid gap-2 sm:grid-cols-2">
                        {votes.map((vote) => (
                          <ReviewerVote key={vote.reviewerId} vote={vote} />
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[#e3e9e6] bg-[#f8faf9] p-5 xl:border-l xl:border-t-0">
                      {canResolve ? (
                        <>
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
                                resolveCitation(
                                  citation,
                                  "include",
                                  "Resolved as include.",
                                )
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f766e] text-sm font-semibold text-white transition hover:bg-[#115e59]"
                            >
                              <Check aria-hidden="true" size={16} />
                              Include
                            </button>
                            <button
                              onClick={() =>
                                resolveCitation(
                                  citation,
                                  "exclude",
                                  "Resolved as exclude.",
                                )
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#e7b7ad] bg-[#fff0ec] text-sm font-semibold text-[#a24736] transition hover:bg-[#ffe3dc]"
                            >
                              <X aria-hidden="true" size={16} />
                              Exclude
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex gap-3">
                          <ShieldCheck
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-[#5b86c5]"
                            size={19}
                          />
                          <div>
                            <p className="text-sm font-semibold text-[#26322f]">
                              Resolution is assigned
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#66736f]">
                              The project owner or adjudicator will make the
                              final decision.
                            </p>
                          </div>
                        </div>
                      )}
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
            <CircleCheckBig
              aria-hidden="true"
              className="text-[#0f766e]"
              size={18}
            />
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

function ReviewerVote({ vote }: { vote: HostedReviewerDecision }) {
  const verdictStyles: Record<Verdict, string> = {
    include: "bg-[#ecfdf5] text-[#0f766e]",
    maybe: "bg-[#fff3da] text-[#8a5a0c]",
    exclude: "bg-[#fff0ec] text-[#a24736]",
  };

  return (
    <div className="rounded-md border border-[#dde5e2] bg-[#fafcfb] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-[#52605c]">
          {vote.reviewerEmail}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${verdictStyles[vote.verdict]}`}
        >
          {vote.verdict}
        </span>
      </div>
      <p className="mt-1 text-[11px] capitalize text-[#86918d]">
        {roleLabel(vote.reviewerRole)}
      </p>
      {vote.reason ? (
        <p className="mt-2 text-xs leading-5 text-[#66736f]">{vote.reason}</p>
      ) : null}
    </div>
  );
}

function groupVotes(decisions: HostedReviewerDecision[]) {
  const grouped = new Map<string, HostedReviewerDecision[]>();

  decisions.forEach((decision) => {
    const current = grouped.get(decision.citationId) ?? [];
    current.push(decision);
    grouped.set(decision.citationId, current);
  });

  return grouped;
}

function requiresResolution(
  votes: HostedReviewerDecision[],
  expectedVotes: number,
) {
  if (votes.length < expectedVotes) {
    return false;
  }

  return (
    votes.some((vote) => vote.verdict === "maybe") ||
    new Set(votes.map((vote) => vote.verdict)).size > 1
  );
}

function conflictLabel(votes: HostedReviewerDecision[]) {
  return votes.some((vote) => vote.verdict === "maybe")
    ? "Uncertain decision"
    : "Reviewer conflict";
}

function resolutionDescription(mode: ScreeningMode) {
  if (mode === "solo") {
    return "Make a final include or exclude decision for records you marked Maybe.";
  }
  if (mode === "dual_adjudicated") {
    return "Compare both independent votes. The project owner or adjudicator resolves disagreements and Maybe decisions.";
  }
  return "Compare both independent votes and resolve disagreements or Maybe decisions.";
}

function roleLabel(role: ReviewerRole) {
  return role === "owner" ? "Owner reviewer" : "Independent reviewer";
}
