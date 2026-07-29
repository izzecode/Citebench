"use client";

import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Database,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/app";
  const isInvitation = searchParams.get("invite") === "1";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "claiming" | "sending" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const supabase = getSupabaseBrowserClient();
  const supabaseConfigured = Boolean(supabase);

  useEffect(() => {
    if (!isInvitation || !supabase) {
      return;
    }

    let cancelled = false;

    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || cancelled) {
        return;
      }

      setStatus("claiming");
      setMessage("You are already signed in. Connecting your review access...");

      const { error } = await supabase.rpc("accept_pending_invites");
      if (cancelled) {
        return;
      }

      if (error) {
        setStatus("error");
        setMessage("Your invitation could not be connected. Sign out and use the invited email address.");
        return;
      }

      router.replace(next);
    });

    return () => {
      cancelled = true;
    };
  }, [isInvitation, next, router, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not connected yet. Use the local prototype below.");
      return;
    }

    setStatus("sending");
    setMessage("");

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setStatus("error");
      setMessage(
        error.message.toLowerCase().includes("rate limit")
          ? "Email limit reached. Open the newest Citebench link already in your inbox, or wait before requesting another. Reliable team invitations require custom SMTP."
          : error.message,
      );
      return;
    }

    setStatus("sent");
    setMessage(`Check ${email.trim()} for your Citebench sign-in link.`);
  }

  const callbackError = searchParams.get("error");

  return (
    <main className="grid min-h-screen bg-white text-[#17211f] lg:grid-cols-[0.8fr_1.2fr]">
      <section className="hidden bg-[#171a1f] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-[#60a5fa] text-[#0f172a]">
            <BookOpenCheck aria-hidden="true" size={20} />
          </span>
          <span className="text-lg font-semibold">Citebench</span>
        </Link>

        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase text-[#93c5fd]">
            Evidence review workspace
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight">
            Move from search results to defensible decisions.
          </h2>
          <div className="mt-8 space-y-4">
            <Benefit text="Map citation exports and flag duplicate records" />
            <Benefit text="Keep reviewer decisions tied to every citation" />
            <Benefit text="Build PRISMA-ready totals from live project data" />
          </div>
        </div>

        <p className="text-xs leading-5 text-[#8fa39d]">
          Designed for small systematic and scoping review teams.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-2 lg:hidden">
            <span className="grid size-9 place-items-center rounded-md bg-[#2563eb] text-white">
              <BookOpenCheck aria-hidden="true" size={18} />
            </span>
            <span className="font-semibold">Citebench</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-[#eff6ff] text-[#2563eb]">
              <ShieldCheck aria-hidden="true" size={19} />
            </span>
            <p className="text-xs font-semibold uppercase text-[#1d4ed8]">
              Secure access
            </p>
          </div>
          <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">
            {isInvitation ? "Join this Citebench review" : "Welcome to Citebench"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#66736f]">
            {isInvitation
              ? "Use the email address your project owner invited. We will send a secure link that opens the screening queue."
              : "Enter your email to receive a secure sign-in link. No password to remember."}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-7 border border-[#d8e0dd] bg-white p-5 shadow-[0_10px_35px_rgba(23,33,31,0.05)] sm:p-6"
          >
          <label className="block text-sm font-medium text-[#26312f]">
            Email address
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="mt-2 h-11 w-full rounded-md border border-[#cbd5d1] bg-white px-3.5 text-sm outline-none transition placeholder:text-[#9aa6a2] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]"
            />
          </label>
          <button
            type="submit"
            disabled={
              status === "claiming" ||
              status === "sending" ||
              status === "sent"
            }
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "claiming"
              ? "Opening review..."
              : status === "sending"
              ? "Sending..."
              : status === "sent"
                ? "Sign-in link sent"
                : isInvitation
                  ? "Send my review access link"
                  : "Email me a sign-in link"}
            {status === "sent" ? (
              <Check aria-hidden="true" size={16} />
            ) : (
              <ArrowRight aria-hidden="true" size={16} />
            )}
          </button>
          {message ? (
            <p
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                status === "sent"
                  ? "mt-4 bg-[#e8f5f0] text-[#176157]"
                  : "mt-4 bg-[#fff4ed] text-[#9a3412]"
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}
          {callbackError ? (
            <p
              className="mt-4 rounded-md bg-[#fff4ed] px-3 py-2 text-sm font-medium text-[#9a3412]"
              role="alert"
            >
              That sign-in link could not be completed. Please request a new one.
            </p>
          ) : null}
          <Link
            href="/app"
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#cbd5d1] bg-white px-5 text-sm font-semibold text-[#26322f] transition hover:border-[#9aaba5] hover:bg-[#f8faf9]"
          >
            <Database aria-hidden="true" size={16} />
            Explore the local demo
          </Link>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-[#7a8682]">
            {supabaseConfigured
              ? "Secure email sign-in is connected and ready."
              : "Email sign-in will activate when Supabase is connected."}
          </p>
        </div>
      </section>
    </main>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[#c6d3cf]">
      <span className="grid size-6 place-items-center rounded-md bg-white/10 text-[#60a5fa]">
        <Check aria-hidden="true" size={14} />
      </span>
      {text}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
