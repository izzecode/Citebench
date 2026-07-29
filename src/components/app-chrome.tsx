"use client";

import {
  BookOpenCheck,
  ExternalLink,
  FolderKanban,
  Home,
  LogOut,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const navigation = [
  { href: "/app", label: "Projects", icon: FolderKanban },
  { href: "/app/projects/new", label: "New review", icon: Plus },
];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const supabaseConfigured = isSupabaseConfigured();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    void supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? "");
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    window.location.assign("/sign-in");
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17211f]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[#2a3038] bg-[#171a1f] text-white lg:flex">
        <div className="flex h-20 items-center border-b border-white/10 px-5">
          <Link href="/app" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-[#60a5fa] text-[#0f172a]">
              <BookOpenCheck aria-hidden="true" size={19} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-base font-semibold">Citebench</span>
              <span className="block text-[11px] text-[#a9b8b4]">
                Review workspace
              </span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase text-[#81938e]">
            Workspace
          </p>
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/app"
                  ? pathname === "/app" ||
                    (pathname.startsWith("/app/projects/") &&
                      pathname !== "/app/projects/new")
                  : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-[#b7c5c1] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon aria-hidden="true" size={17} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="rounded-md border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-white">
              <span className="size-2 rounded-full bg-[#60a5fa]" />
              {userEmail
                ? "Supabase workspace"
                : supabaseConfigured
                  ? "Supabase connected"
                  : "Local workspace"}
            </div>
            <p className="mt-2 truncate text-xs leading-5 text-[#93a6a0]">
              {userEmail ||
                (supabaseConfigured
                  ? "Sign in to sync projects"
                  : "Supabase connection pending")}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <Link
              href="/"
              title="Open homepage"
              className="flex h-9 items-center justify-center gap-2 rounded-md text-xs text-[#a9b8b4] transition hover:bg-white/5 hover:text-white"
            >
              <Home aria-hidden="true" size={15} />
              Home
            </Link>
            {userEmail ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-9 items-center justify-center gap-2 rounded-md text-xs text-[#a9b8b4] transition hover:bg-white/5 hover:text-white"
              >
                <LogOut aria-hidden="true" size={15} />
                Sign out
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="flex h-9 items-center justify-center gap-2 rounded-md text-xs text-[#a9b8b4] transition hover:bg-white/5 hover:text-white"
              >
                <UserRound aria-hidden="true" size={15} />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dfe5e2] bg-white px-4 lg:hidden">
        <Link href="/app" className="flex items-center gap-2.5 font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-[#2563eb] text-white">
            <BookOpenCheck aria-hidden="true" size={17} />
          </span>
          Citebench
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/app"
            title="Projects"
            className="grid size-10 place-items-center rounded-md text-[#53615d] hover:bg-[#eef2f0]"
          >
            <FolderKanban aria-hidden="true" size={18} />
          </Link>
          <Link
            href="/app/projects/new"
            title="New review"
            className="grid size-10 place-items-center rounded-md bg-[#2563eb] text-white"
          >
            <Plus aria-hidden="true" size={18} />
          </Link>
          {userEmail ? (
            <button
              type="button"
              title="Sign out"
              aria-label="Sign out"
              onClick={handleSignOut}
              className="grid size-10 place-items-center rounded-md text-[#53615d] hover:bg-[#eef2f0]"
            >
              <LogOut aria-hidden="true" size={18} />
            </button>
          ) : (
            <Link
              href="/sign-in"
              title="Sign in"
              className="grid size-10 place-items-center rounded-md text-[#53615d] hover:bg-[#eef2f0]"
            >
              <UserRound aria-hidden="true" size={18} />
            </Link>
          )}
        </div>
      </header>

      <div className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
          {children}
        </div>
      </div>
    </main>
  );
}

export function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <section className="border border-dashed border-[#bdc9c5] bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-md bg-[#eff6ff] text-[#2563eb]">
        <BookOpenCheck aria-hidden="true" size={22} />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-[#17211f]">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#66736f]">
        {copy}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="min-w-0 border-l-2 border-[#60a5fa] px-4 py-1">
      <p className="truncate text-xs font-medium text-[#6b7773]">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-[#17211f]">{value}</p>
        {detail ? <p className="text-xs text-[#8a9692]">{detail}</p> : null}
      </div>
    </div>
  );
}

export function PageEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase text-[#1d4ed8]">{children}</p>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-[#2563eb] hover:text-[#1e40af]"
    >
      {children}
      <ExternalLink aria-hidden="true" size={14} />
    </Link>
  );
}

export const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cbd5d1] bg-white px-4 text-sm font-semibold text-[#26322f] shadow-sm transition hover:border-[#9aaba5] hover:bg-[#f8faf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93c5fd] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
