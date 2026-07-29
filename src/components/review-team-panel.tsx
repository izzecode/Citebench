"use client";

import {
  Check,
  Clipboard,
  Clock3,
  Gavel,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ReviewerRole, ScreeningMode } from "@/lib/citebench";
import {
  inviteHostedReviewer,
  loadHostedReviewTeam,
  removeHostedReviewer,
  type HostedReviewer,
  type HostedReviewTeam,
} from "@/lib/supabase/projects";

type InviteRole = Exclude<ReviewerRole, "owner">;

export function ReviewTeamPanel({
  projectId,
  storageMode,
  screeningMode,
  onScreeningModeChange,
}: {
  projectId: string;
  storageMode: "local" | "hosted";
  screeningMode: ScreeningMode;
  onScreeningModeChange: (mode: ScreeningMode) => Promise<boolean>;
}) {
  const [team, setTeam] = useState<HostedReviewTeam | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("reviewer");
  const [copiedReviewerId, setCopiedReviewerId] = useState("");
  const [removingReviewerId, setRemovingReviewerId] = useState("");
  const [updatingMode, setUpdatingMode] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "idle" | "inviting" | "invited" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (storageMode !== "hosted") {
      return;
    }

    let cancelled = false;

    void loadHostedReviewTeam(projectId)
      .then((nextTeam) => {
        if (!cancelled) {
          setTeam(nextTeam);
          setStatus("idle");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "The review team could not be loaded.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, storageMode]);

  const mode = team?.screeningMode ?? screeningMode;
  const availableRoles = getAvailableRoles(mode, team?.reviewers ?? []);
  const selectedRole = availableRoles.includes(inviteRole)
    ? inviteRole
    : (availableRoles[0] ?? "reviewer");
  const canInvite = Boolean(team?.isOwner && availableRoles.length);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("inviting");
    setMessage("");
    setCopiedReviewerId("");

    try {
      const reviewer = await inviteHostedReviewer(
        projectId,
        email,
        selectedRole,
      );
      setTeam((current) =>
        current
          ? { ...current, reviewers: [...current.reviewers, reviewer] }
          : current,
      );
      setEmail("");
      setStatus("invited");
      setMessage(
        `Invitation created for ${reviewer.email}. Copy the ${roleLabel(reviewer.role).toLowerCase()} link and send it to them.`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The team member could not be invited.",
      );
    }
  }

  async function copyInviteLink(reviewer: HostedReviewer) {
    try {
      await navigator.clipboard.writeText(
        buildInviteUrl(projectId, reviewer.role),
      );
      setCopiedReviewerId(reviewer.id);
      setStatus("idle");
      setMessage(
        `${roleLabel(reviewer.role)} link copied. Send it to ${reviewer.email}.`,
      );
    } catch {
      setStatus("error");
      setMessage("The link could not be copied. Select and copy it below.");
    }
  }

  async function handleModeChange(nextMode: ScreeningMode) {
    setUpdatingMode(true);
    setMessage("");

    const saved = await onScreeningModeChange(nextMode);
    if (saved) {
      setTeam((current) =>
        current ? { ...current, screeningMode: nextMode } : current,
      );
      setStatus("idle");
      setMessage(`Review workflow changed to ${modeLabel(nextMode)}.`);
    } else {
      setStatus("error");
      setMessage("The review workflow could not be changed.");
    }

    setUpdatingMode(false);
  }

  async function handleRemove(reviewer: HostedReviewer) {
    const confirmed = window.confirm(
      `Remove ${reviewer.email} from this project? Their saved screening decisions will also be removed.`,
    );
    if (!confirmed) {
      return;
    }

    setRemovingReviewerId(reviewer.id);
    setMessage("");

    try {
      await removeHostedReviewer(projectId, reviewer.id);
      setTeam((current) =>
        current
          ? {
              ...current,
              reviewers: current.reviewers.filter(
                (item) => item.id !== reviewer.id,
              ),
            }
          : current,
      );
      setStatus("idle");
      setMessage(`${reviewer.email} was removed from the review team.`);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The team member could not be removed.",
      );
    } finally {
      setRemovingReviewerId("");
    }
  }

  if (storageMode !== "hosted") {
    return (
      <section id="review-team" className="border border-[#d8e0dd] bg-white">
        <PanelHeader mode={screeningMode} />
        <WorkflowControl
          mode={screeningMode}
          updating={updatingMode}
          onChange={handleModeChange}
        />
        <div className="flex gap-3 px-5 py-5">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[#5b86c5]"
            size={19}
          />
          <div>
            <p className="text-sm font-semibold text-[#26322f]">
              {screeningMode === "solo"
                ? "Solo workflow selected"
                : "Sign in to invite the review team"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#66736f]">
              {screeningMode === "solo"
                ? "This local project does not require additional reviewers."
                : "Team invitations are available for projects stored in Supabase."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="review-team" className="border border-[#d8e0dd] bg-white">
      <PanelHeader mode={mode} />

      {team?.isOwner ? (
        <WorkflowControl
          mode={mode}
          updating={updatingMode}
          hasReviewer={team.reviewers.some(
            (reviewer) => reviewer.role === "reviewer",
          )}
          hasAdjudicator={team.reviewers.some(
            (reviewer) => reviewer.role === "adjudicator",
          )}
          onChange={handleModeChange}
        />
      ) : null}

      <div className="divide-y divide-[#e6ebe9]">
        {status === "loading" ? (
          <div className="flex items-center gap-2 px-5 py-5 text-sm text-[#66736f]">
            <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
            Loading review team
          </div>
        ) : null}

        {team?.reviewers.map((reviewer) => {
          const inviteUrl =
            reviewer.status === "pending"
              ? buildInviteUrl(projectId, reviewer.role)
              : "";

          return (
            <div key={reviewer.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#26322f]">
                    {reviewer.email}
                  </p>
                  <p className="mt-1 text-xs text-[#7a8682]">
                    {roleLabel(reviewer.role)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      reviewer.status === "active"
                        ? "bg-[#ecfdf5] text-[#0f766e]"
                        : "bg-[#fff3da] text-[#8a5a0c]"
                    }`}
                  >
                    {reviewer.status === "active" ? (
                      <Check aria-hidden="true" size={13} />
                    ) : (
                      <Clock3 aria-hidden="true" size={13} />
                    )}
                    {reviewer.status}
                  </span>
                  {team.isOwner && reviewer.role !== "owner" ? (
                    <button
                      type="button"
                      title={`Remove ${roleLabel(reviewer.role).toLowerCase()}`}
                      aria-label={`Remove ${reviewer.email}`}
                      disabled={removingReviewerId === reviewer.id}
                      onClick={() => handleRemove(reviewer)}
                      className="grid size-8 place-items-center rounded-md text-[#8a5a54] transition hover:bg-[#fff0ec] hover:text-[#a24736] disabled:opacity-50"
                    >
                      {removingReviewerId === reviewer.id ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="animate-spin"
                          size={15}
                        />
                      ) : (
                        <Trash2 aria-hidden="true" size={15} />
                      )}
                    </button>
                  ) : null}
                </div>
              </div>

              {team.isOwner && reviewer.status === "pending" ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    readOnly
                    value={inviteUrl}
                    aria-label={`${roleLabel(reviewer.role)} invitation link`}
                    className="h-10 min-w-0 rounded-md border border-[#cbd5d1] bg-[#fafcfb] px-3 text-xs text-[#52605c] outline-none"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    onClick={() => copyInviteLink(reviewer)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b8c4c0] bg-white px-4 text-sm font-semibold text-[#26322f] transition hover:bg-[#f2f5f4]"
                  >
                    {copiedReviewerId === reviewer.id ? (
                      <Check aria-hidden="true" size={16} />
                    ) : (
                      <Clipboard aria-hidden="true" size={16} />
                    )}
                    {copiedReviewerId === reviewer.id ? "Copied" : "Copy link"}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {canInvite ? (
        <form
          onSubmit={handleInvite}
          className="border-t border-[#e4e9e7] bg-[#fafcfb] p-4 sm:p-5"
        >
          <div
            className={`grid gap-3 ${
              availableRoles.length > 1
                ? "sm:grid-cols-[170px_minmax(0,1fr)_auto]"
                : "sm:grid-cols-[minmax(0,1fr)_auto]"
            }`}
          >
            {availableRoles.length > 1 ? (
              <label className="text-sm font-semibold text-[#26322f]">
                Invitation role
                <select
                  value={selectedRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as InviteRole)
                  }
                  className="mt-2 h-11 w-full rounded-md border border-[#cbd5d1] bg-white px-3 text-sm outline-none transition focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
                >
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="text-sm font-semibold text-[#26322f]">
              {roleLabel(selectedRole)} email
              <span className="relative mt-2 block">
                <Mail
                  aria-hidden="true"
                  className="absolute left-3 top-3 text-[#7a8682]"
                  size={17}
                />
                <input
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setMessage("");
                    setStatus("idle");
                  }}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="team.member@example.com"
                  className="h-11 w-full rounded-md border border-[#cbd5d1] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-[#9aa6a2] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={status === "inviting"}
              className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "inviting" ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin"
                  size={16}
                />
              ) : (
                <UserPlus aria-hidden="true" size={16} />
              )}
              Create invitation
            </button>
          </div>
        </form>
      ) : null}

      {team?.isOwner && mode === "solo" ? (
        <p className="border-t border-[#e4e9e7] bg-[#fafcfb] px-5 py-4 text-sm text-[#66736f]">
          Solo projects do not require another reviewer.
        </p>
      ) : null}

      {message ? (
        <p
          className={`border-t px-5 py-3 text-sm font-medium ${
            status === "error"
              ? "border-[#f0c4b8] bg-[#fff4f0] text-[#9a3f2e]"
              : "border-[#bfe3d8] bg-[#effaf6] text-[#176157]"
          }`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

function PanelHeader({ mode }: { mode: ScreeningMode }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#e4e9e7] px-5 py-4">
      <span className="grid size-9 place-items-center rounded-md bg-[#eff6ff] text-[#2563eb]">
        {mode === "dual_adjudicated" ? (
          <Gavel aria-hidden="true" size={18} />
        ) : (
          <Users aria-hidden="true" size={18} />
        )}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-[#17211f]">Review team</h2>
        <p className="mt-0.5 text-xs text-[#7a8682]">
          {modeDescription(mode)}
        </p>
      </div>
    </div>
  );
}

function WorkflowControl({
  mode,
  updating,
  hasReviewer = false,
  hasAdjudicator = false,
  onChange,
}: {
  mode: ScreeningMode;
  updating: boolean;
  hasReviewer?: boolean;
  hasAdjudicator?: boolean;
  onChange: (mode: ScreeningMode) => Promise<void>;
}) {
  return (
    <div className="grid gap-3 border-b border-[#e4e9e7] bg-[#fafcfb] px-5 py-4 sm:grid-cols-[minmax(0,280px)_1fr] sm:items-center">
      <label className="text-sm font-semibold text-[#26322f]">
        Review workflow
        <select
          value={mode}
          disabled={updating}
          onChange={(event) =>
            void onChange(event.target.value as ScreeningMode)
          }
          className="mt-2 h-10 w-full rounded-md border border-[#cbd5d1] bg-white px-3 text-sm outline-none transition focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe] disabled:opacity-60"
        >
          <option value="solo" disabled={hasReviewer || hasAdjudicator}>
            Solo · 1 reviewer
          </option>
          <option value="dual" disabled={hasAdjudicator}>
            Dual independent · 2 reviewers
          </option>
          <option value="dual_adjudicated">
            Dual + adjudicator · 3 people
          </option>
        </select>
      </label>
      <p className="text-xs leading-5 text-[#6f7d78]">
        {updating
          ? "Saving workflow..."
          : hasReviewer || hasAdjudicator
            ? "Smaller workflows become available after incompatible team slots are removed."
            : "The owner can adjust this before or during screening."}
      </p>
    </div>
  );
}

function getAvailableRoles(
  mode: ScreeningMode,
  reviewers: HostedReviewer[],
): InviteRole[] {
  const allowed: InviteRole[] =
    mode === "dual_adjudicated"
      ? ["reviewer", "adjudicator"]
      : mode === "dual"
        ? ["reviewer"]
        : [];

  return allowed.filter(
    (role) => !reviewers.some((reviewer) => reviewer.role === role),
  );
}

function buildInviteUrl(projectId: string, role: ReviewerRole) {
  if (typeof window === "undefined") {
    return "";
  }

  const next =
    role === "adjudicator"
      ? `/app/projects/${projectId}/conflicts`
      : `/app/projects/${projectId}/screen`;
  const params = new URLSearchParams({ invite: "1", next });
  return `${window.location.origin}/sign-in?${params.toString()}`;
}

function roleLabel(role: ReviewerRole) {
  if (role === "owner") {
    return "Owner reviewer";
  }
  if (role === "adjudicator") {
    return "Adjudicator";
  }
  return "Independent reviewer";
}

function modeDescription(mode: ScreeningMode) {
  if (mode === "solo") {
    return "One owner reviewer";
  }
  if (mode === "dual_adjudicated") {
    return "Two independent screeners and one adjudicator";
  }
  return "Two independent reviewers";
}

function modeLabel(mode: ScreeningMode) {
  if (mode === "solo") {
    return "Solo";
  }
  if (mode === "dual_adjudicated") {
    return "Dual + adjudicator";
  }
  return "Dual independent";
}
