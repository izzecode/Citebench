"use client";

import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  FileUp,
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
import type { Citation } from "@/lib/citebench";
import {
  fullTextExclusionReasons,
  getFullTextEligibleCitations,
  loadHostedFullTextWorkspace,
  saveFullTextDecision,
  saveFullTextFinalDecision,
  uploadFullTextPdf,
  type FullTextDecision,
  type FullTextVerdict,
  type FullTextWorkspace,
} from "@/lib/supabase/full-text";
import { useLocalProject } from "@/lib/use-local-project";

export default function FullTextPage() {
  const params = useParams<{ id: string }>();
  const { project, loaded, storageMode } = useLocalProject(params.id);
  const [eligible, setEligible] = useState<Citation[]>([]);
  const [workspace, setWorkspace] = useState<FullTextWorkspace | null>(null);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyCitationId, setBusyCitationId] = useState("");
  const [reasonByCitation, setReasonByCitation] = useState<
    Record<string, string>
  >({});
  const [notesByCitation, setNotesByCitation] = useState<
    Record<string, string>
  >({});
  const [rationaleByCitation, setRationaleByCitation] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!project || storageMode !== "hosted") {
      return;
    }

    let cancelled = false;

    void Promise.all([
      getFullTextEligibleCitations(project),
      loadHostedFullTextWorkspace(project.id),
    ])
      .then(([nextEligible, nextWorkspace]) => {
        if (!cancelled) {
          setEligible(nextEligible);
          setWorkspace(nextWorkspace);
          setWorkspaceLoaded(true);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "The full-text workspace could not be loaded.",
          );
          setWorkspaceLoaded(true);
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
          copy="This project is not available in the current workspace."
          action={
            <Link href="/app" className={buttonClass}>
              Back to projects
            </Link>
          }
        />
      </AppChrome>
    );
  }

  if (!project || (storageMode === "hosted" && !workspaceLoaded)) {
    return (
      <AppChrome>
        <div className="flex items-center gap-2 text-sm text-[#66736f]">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={17} />
          Loading full-text review
        </div>
      </AppChrome>
    );
  }

  if (storageMode !== "hosted") {
    return (
      <AppChrome>
        <EmptyState
          title="Full-text review needs a hosted project"
          copy="PDFs and full-text decisions are stored privately in Supabase. Sign in and create a hosted project to use this stage."
          action={
            <Link href="/sign-in" className={buttonClass}>
              Sign in
            </Link>
          }
        />
      </AppChrome>
    );
  }

  const documentsByCitation = new Map(
    workspace?.documents.map((document) => [document.citationId, document]),
  );
  const projectId = project.id;
  const decisionsByCitation = groupDecisions(workspace?.decisions ?? []);
  const finalByCitation = new Map(
    workspace?.finalDecisions.map((decision) => [
      decision.citationId,
      decision,
    ]),
  );
  const currentReviewerId = workspace?.currentReviewerId;
  const canResolve =
    workspace?.currentRole === "owner" ||
    workspace?.currentRole === "adjudicator";
  const expectedVotes = project.screeningMode === "solo" ? 1 : 2;
  const completed = eligible.filter((citation) => {
    const votes = decisionsByCitation.get(citation.id) ?? [];
    return (
      finalByCitation.has(citation.id) ||
      (votes.length >= expectedVotes &&
        new Set(votes.map((vote) => vote.verdict)).size === 1)
    );
  }).length;
  const conflicts = eligible.filter((citation) =>
    isConflict(
      decisionsByCitation.get(citation.id) ?? [],
      expectedVotes,
      finalByCitation.has(citation.id),
    ),
  ).length;

  async function refreshWorkspace() {
    const nextWorkspace = await loadHostedFullTextWorkspace(projectId);
    setWorkspace(nextWorkspace);
  }

  async function handleUpload(citationId: string, file?: File) {
    if (!file) {
      return;
    }

    setBusyCitationId(citationId);
    setError("");
    setMessage("");

    try {
      await uploadFullTextPdf(projectId, citationId, file);
      await refreshWorkspace();
      setMessage("Full-text PDF saved securely.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The PDF could not be uploaded.",
      );
    } finally {
      setBusyCitationId("");
    }
  }

  async function handleDecision(
    citationId: string,
    verdict: FullTextVerdict,
    currentDecision?: FullTextDecision,
  ) {
    if (!currentReviewerId) {
      return;
    }

    setBusyCitationId(citationId);
    setError("");
    setMessage("");

    try {
      await saveFullTextDecision(
        citationId,
        currentReviewerId,
        verdict,
        reasonByCitation[citationId] ??
          currentDecision?.exclusionReason ??
          "",
        notesByCitation[citationId] ?? currentDecision?.notes ?? "",
      );
      await refreshWorkspace();
      setMessage("Full-text decision saved.");
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "The full-text decision could not be saved.",
      );
    } finally {
      setBusyCitationId("");
    }
  }

  async function handleFinalDecision(
    citationId: string,
    verdict: FullTextVerdict,
  ) {
    setBusyCitationId(citationId);
    setError("");
    setMessage("");

    try {
      await saveFullTextFinalDecision(
        citationId,
        verdict,
        rationaleByCitation[citationId] ?? "",
      );
      await refreshWorkspace();
      setMessage("Final full-text decision saved.");
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "The final decision could not be saved.",
      );
    } finally {
      setBusyCitationId("");
    }
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

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PageEyebrow>Full-text eligibility</PageEyebrow>
          <h1 className="mt-2 text-3xl font-semibold text-[#17211f] sm:text-4xl">
            Review the complete evidence
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
            Attach private PDFs, record eligibility decisions, and resolve
            disagreements with a traceable rationale.
          </p>
        </div>
        <div className="grid grid-cols-3 border border-[#d8e0dd] bg-white">
          <StageMetric label="Eligible" value={eligible.length} />
          <StageMetric label="Complete" value={completed} />
          <StageMetric label="Conflicts" value={conflicts} />
        </div>
      </div>

      {error || message ? (
        <p
          className={`mt-5 border px-4 py-3 text-sm font-medium ${
            error
              ? "border-[#f0c4b8] bg-[#fff4f0] text-[#9a3f2e]"
              : "border-[#bfe3d8] bg-[#effaf6] text-[#176157]"
          }`}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </p>
      ) : null}

      <section className="mt-7">
        {!eligible.length ? (
          <EmptyState
            title="No citations are ready for full text"
            copy="Citations appear here after the title and abstract stage reaches a final Include decision."
            action={
              <Link
                href={`/app/projects/${project.id}/screen`}
                className={buttonClass}
              >
                Continue screening
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {eligible.map((citation) => {
              const document = documentsByCitation.get(citation.id);
              const votes = decisionsByCitation.get(citation.id) ?? [];
              const currentDecision = votes.find(
                (decision) => decision.reviewerId === currentReviewerId,
              );
              const finalDecision = finalByCitation.get(citation.id);
              const conflict = isConflict(
                votes,
                expectedVotes,
                Boolean(finalDecision),
              );
              const busy = busyCitationId === citation.id;
              const canMakePrimaryDecision =
                workspace?.currentRole !== "adjudicator" && currentReviewerId;

              return (
                <article
                  key={citation.id}
                  className="border border-[#d8e0dd] bg-white shadow-[0_8px_24px_rgba(23,33,31,0.04)]"
                >
                  <div className="grid xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase text-[#2563eb]">
                            {citation.year || "Year unavailable"} ·{" "}
                            {citation.journal || "Journal unavailable"}
                          </p>
                          <h2 className="mt-2 text-lg font-semibold text-[#17211f]">
                            {citation.title}
                          </h2>
                          <p className="mt-2 text-sm text-[#66736f]">
                            {citation.authors || "Authors unavailable"}
                          </p>
                        </div>
                        {finalDecision ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-xs font-semibold capitalize text-[#0f766e]">
                            <ShieldCheck aria-hidden="true" size={13} />
                            Final {finalDecision.verdict}
                          </span>
                        ) : conflict ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff3da] px-2.5 py-1 text-xs font-semibold text-[#8a5a0c]">
                            <GitCompareArrows aria-hidden="true" size={13} />
                            Needs resolution
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-5 border border-[#dde5e2] bg-[#fafcfb] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#eff6ff] text-[#2563eb]">
                              <FileText aria-hidden="true" size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#26322f]">
                                {document?.fileName ?? "No PDF attached"}
                              </p>
                              <p className="mt-0.5 text-xs text-[#7a8682]">
                                {document
                                  ? formatFileSize(document.sizeBytes)
                                  : "Private project storage · 25 MB maximum"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {document?.signedUrl ? (
                              <a
                                href={document.signedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#b8c4c0] bg-white px-3 text-xs font-semibold text-[#26322f] hover:bg-[#f2f5f4]"
                              >
                                <ExternalLink aria-hidden="true" size={14} />
                                Open PDF
                              </a>
                            ) : null}
                            <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-[#2563eb] px-3 text-xs font-semibold text-white hover:bg-[#1d4ed8]">
                              {busy ? (
                                <LoaderCircle
                                  aria-hidden="true"
                                  className="animate-spin"
                                  size={14}
                                />
                              ) : (
                                <FileUp aria-hidden="true" size={14} />
                              )}
                              {document ? "Replace PDF" : "Upload PDF"}
                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                className="sr-only"
                                disabled={busy}
                                onChange={(event) =>
                                  void handleUpload(
                                    citation.id,
                                    event.target.files?.[0],
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {votes.length ? (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {votes.map((vote) => (
                            <VoteSummary key={vote.reviewerId} vote={vote} />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="border-t border-[#e3e9e6] bg-[#f8faf9] p-5 xl:border-l xl:border-t-0">
                      {canMakePrimaryDecision ? (
                        <>
                          <label className="block text-sm font-semibold text-[#26322f]">
                            Full-text exclusion reason
                            <select
                              value={
                                reasonByCitation[citation.id] ??
                                currentDecision?.exclusionReason ??
                                ""
                              }
                              onChange={(event) =>
                                setReasonByCitation((current) => ({
                                  ...current,
                                  [citation.id]: event.target.value,
                                }))
                              }
                              className="mt-2 h-10 w-full rounded-md border border-[#cbd5d1] bg-white px-3 text-sm outline-none focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
                            >
                              <option value="">Choose when excluding</option>
                              {fullTextExclusionReasons.map((reason) => (
                                <option key={reason} value={reason}>
                                  {reason}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="mt-3 block text-sm font-semibold text-[#26322f]">
                            Reviewer notes
                            <textarea
                              rows={3}
                              value={
                                notesByCitation[citation.id] ??
                                currentDecision?.notes ??
                                ""
                              }
                              onChange={(event) =>
                                setNotesByCitation((current) => ({
                                  ...current,
                                  [citation.id]: event.target.value,
                                }))
                              }
                              placeholder="Optional evidence or page reference"
                              className="mt-2 w-full rounded-md border border-[#cbd5d1] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
                            />
                          </label>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={!document || busy}
                              onClick={() =>
                                void handleDecision(
                                  citation.id,
                                  "include",
                                  currentDecision,
                                )
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#0f766e] text-sm font-semibold text-white hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check aria-hidden="true" size={16} />
                              Include
                            </button>
                            <button
                              type="button"
                              disabled={!document || busy}
                              onClick={() =>
                                void handleDecision(
                                  citation.id,
                                  "exclude",
                                  currentDecision,
                                )
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#e7b7ad] bg-[#fff0ec] text-sm font-semibold text-[#a24736] hover:bg-[#ffe3dc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X aria-hidden="true" size={16} />
                              Exclude
                            </button>
                          </div>
                          {!document ? (
                            <p className="mt-2 text-xs text-[#7a8682]">
                              Attach the full text before recording eligibility.
                            </p>
                          ) : null}
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
                              Adjudication role
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#66736f]">
                              You resolve disagreements after both reviewers
                              submit their eligibility decisions.
                            </p>
                          </div>
                        </div>
                      )}

                      {conflict && canResolve ? (
                        <div className="mt-5 border-t border-[#dce4e1] pt-5">
                          <p className="text-sm font-semibold text-[#26322f]">
                            Final eligibility decision
                          </p>
                          <textarea
                            rows={3}
                            value={rationaleByCitation[citation.id] ?? ""}
                            onChange={(event) =>
                              setRationaleByCitation((current) => ({
                                ...current,
                                [citation.id]: event.target.value,
                              }))
                            }
                            placeholder="Required adjudication rationale"
                            className="mt-2 w-full rounded-md border border-[#cbd5d1] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
                          />
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void handleFinalDecision(citation.id, "include")
                              }
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#0f766e] text-xs font-semibold text-white disabled:opacity-50"
                            >
                              Final include
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void handleFinalDecision(citation.id, "exclude")
                              }
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#e7b7ad] bg-[#fff0ec] text-xs font-semibold text-[#a24736] disabled:opacity-50"
                            >
                              Final exclude
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppChrome>
  );
}

function VoteSummary({ vote }: { vote: FullTextDecision }) {
  return (
    <div className="rounded-md border border-[#dde5e2] bg-[#fafcfb] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-[#52605c]">
          {vote.reviewerEmail}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
            vote.verdict === "include"
              ? "bg-[#ecfdf5] text-[#0f766e]"
              : "bg-[#fff0ec] text-[#a24736]"
          }`}
        >
          {vote.verdict}
        </span>
      </div>
      {vote.exclusionReason ? (
        <p className="mt-2 text-xs font-medium text-[#8a5a54]">
          {vote.exclusionReason}
        </p>
      ) : null}
      {vote.notes ? (
        <p className="mt-1 text-xs leading-5 text-[#66736f]">{vote.notes}</p>
      ) : null}
    </div>
  );
}

function StageMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 border-l border-[#e3e9e6] px-3 py-2 first:border-l-0">
      <p className="text-[11px] text-[#7a8682]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-[#17211f]">{value}</p>
    </div>
  );
}

function groupDecisions(decisions: FullTextDecision[]) {
  const grouped = new Map<string, FullTextDecision[]>();

  decisions.forEach((decision) => {
    const current = grouped.get(decision.citationId) ?? [];
    current.push(decision);
    grouped.set(decision.citationId, current);
  });

  return grouped;
}

function isConflict(
  decisions: FullTextDecision[],
  expectedVotes: number,
  resolved: boolean,
) {
  if (resolved || expectedVotes < 2 || decisions.length < expectedVotes) {
    return false;
  }

  return new Set(decisions.map((decision) => decision.verdict)).size > 1;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
