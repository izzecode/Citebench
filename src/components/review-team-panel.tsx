"use client";

import {
  Check,
  Clipboard,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  inviteHostedReviewer,
  loadHostedReviewTeam,
  type HostedReviewTeam,
} from "@/lib/supabase/projects";

export function ReviewTeamPanel({
  projectId,
  storageMode,
}: {
  projectId: string;
  storageMode: "local" | "hosted";
}) {
  const [team, setTeam] = useState<HostedReviewTeam | null>(null);
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [status, setStatus] = useState<
    "loading" | "idle" | "inviting" | "invited" | "copied" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (storageMode !== "hosted") {
      return;
    }

    let cancelled = false;
    const next = `/app/projects/${projectId}/screen`;
    const params = new URLSearchParams({ invite: "1", next });
    const nextInviteUrl = `${window.location.origin}/sign-in?${params.toString()}`;

    void loadHostedReviewTeam(projectId)
      .then((nextTeam) => {
        if (!cancelled) {
          setTeam(nextTeam);
          setInviteUrl(nextInviteUrl);
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

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("inviting");
    setMessage("");

    try {
      const reviewer = await inviteHostedReviewer(projectId, email);
      setTeam((current) =>
        current
          ? { ...current, reviewers: [...current.reviewers, reviewer] }
          : current,
      );
      setEmail("");
      setStatus("invited");
      setMessage(
        `Invitation created for ${reviewer.email}. Copy the link and send it to them.`,
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The reviewer could not be invited.",
      );
    }
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setStatus("copied");
      setMessage("Invite link copied. Send it to the invited reviewer.");
    } catch {
      setStatus("error");
      setMessage("The link could not be copied. Select and copy it below.");
    }
  }

  if (storageMode !== "hosted") {
    return (
      <section
        id="review-team"
        className="border border-[#d8e0dd] bg-white"
      >
        <PanelHeader />
        <div className="flex gap-3 px-5 py-5">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[#5b86c5]"
            size={19}
          />
          <div>
            <p className="text-sm font-semibold text-[#26322f]">
              Sign in to invite a reviewer
            </p>
            <p className="mt-1 text-sm leading-6 text-[#66736f]">
              Team invitations are available for projects stored in Supabase.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const coReviewer = team?.reviewers.find(
    (reviewer) => reviewer.role === "reviewer",
  );
  const canInvite = Boolean(team?.isOwner && !coReviewer);

  return (
    <section id="review-team" className="border border-[#d8e0dd] bg-white">
      <PanelHeader />

      <div className="divide-y divide-[#e6ebe9]">
        {status === "loading" ? (
          <div className="flex items-center gap-2 px-5 py-5 text-sm text-[#66736f]">
            <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
            Loading review team
          </div>
        ) : null}

        {team?.reviewers.map((reviewer) => (
          <div
            key={reviewer.id}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#26322f]">
                {reviewer.email}
              </p>
              <p className="mt-1 text-xs capitalize text-[#7a8682]">
                {reviewer.role} reviewer
              </p>
            </div>
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
          </div>
        ))}
      </div>

      {canInvite ? (
        <form
          onSubmit={handleInvite}
          className="border-t border-[#e4e9e7] bg-[#fafcfb] p-4 sm:p-5"
        >
          <label className="block text-sm font-semibold text-[#26322f]">
            Co-reviewer email
            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <span className="relative">
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
                  placeholder="reviewer@example.com"
                  className="h-11 w-full rounded-md border border-[#cbd5d1] bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-[#9aa6a2] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
                />
              </span>
              <button
                type="submit"
                disabled={status === "inviting"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
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
          </label>
        </form>
      ) : null}

      {team?.isOwner && coReviewer ? (
        <div className="border-t border-[#e4e9e7] bg-[#fafcfb] p-4 sm:p-5">
          <p className="text-sm font-semibold text-[#26322f]">
            {coReviewer.status === "pending"
              ? "Share the invitation"
              : "Reviewer access is active"}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#7a8682]">
            {coReviewer.status === "pending"
              ? `Send this link to ${coReviewer.email}. They must sign in with that email.`
              : `${coReviewer.email} can open this project and screen independently.`}
          </p>
          {coReviewer.status === "pending" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                readOnly
                value={inviteUrl}
                aria-label="Reviewer invitation link"
                className="h-10 min-w-0 rounded-md border border-[#cbd5d1] bg-white px-3 text-xs text-[#52605c] outline-none"
                onFocus={(event) => event.currentTarget.select()}
              />
              <button
                type="button"
                onClick={copyInviteLink}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b8c4c0] bg-white px-4 text-sm font-semibold text-[#26322f] transition hover:bg-[#f2f5f4]"
              >
                {status === "copied" ? (
                  <Check aria-hidden="true" size={16} />
                ) : (
                  <Clipboard aria-hidden="true" size={16} />
                )}
                {status === "copied" ? "Copied" : "Copy link"}
              </button>
            </div>
          ) : null}
        </div>
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

function PanelHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-[#e4e9e7] px-5 py-4">
      <span className="grid size-9 place-items-center rounded-md bg-[#eff6ff] text-[#2563eb]">
        <Users aria-hidden="true" size={18} />
      </span>
      <div>
        <h2 className="text-sm font-semibold text-[#17211f]">Review team</h2>
        <p className="mt-0.5 text-xs text-[#7a8682]">
          One owner and one independent co-reviewer
        </p>
      </div>
    </div>
  );
}
