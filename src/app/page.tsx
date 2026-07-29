import {
  ArrowRight,
  BookOpenCheck,
  Check,
  FileSpreadsheet,
  GitCompareArrows,
  ScanSearch,
} from "lucide-react";
import Link from "next/link";

const workflow = [
  {
    icon: FileSpreadsheet,
    step: "01",
    title: "Import and clean search results",
    copy: "Bring in a CSV from PubMed, Scopus, or a reference manager. Citebench maps common columns and flags duplicate records.",
  },
  {
    icon: ScanSearch,
    step: "02",
    title: "Make consistent decisions",
    copy: "Review one title and abstract at a time with clear Include, Maybe, and Exclude choices tied to every record.",
  },
  {
    icon: GitCompareArrows,
    step: "03",
    title: "Resolve disagreements and report",
    copy: "Compare reviewer decisions, resolve uncertainty, and export a screened dataset with PRISMA-ready totals.",
  },
];

const decisions = [
  ["Telehealth follow-up after stroke", "Include", "2023"],
  ["Community screening uptake", "Exclude", "2021"],
  ["Aspirin use after stroke", "Maybe", "2020"],
  ["Home rehabilitation adherence", "Include", "2024"],
];

const boundaries = [
  "Two reviewers per project",
  "Title and abstract screening",
  "CSV import and export",
  "PRISMA flow totals",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#17211f]">
      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <span className="grid size-8 place-items-center rounded-md bg-[#60a5fa] text-[#0f172a]">
              <BookOpenCheck aria-hidden="true" size={17} />
            </span>
            <span className="font-semibold">Citebench</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#bac9c4] sm:flex">
            <a href="#workflow" className="transition hover:text-white">
              Workflow
            </a>
            <a href="#scope" className="transition hover:text-white">
              V1 scope
            </a>
            <Link href="/sign-in" className="transition hover:text-white">
              Sign in
            </Link>
          </nav>
          <Link
            href="/app"
            className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-3.5 text-sm font-semibold text-[#1e40af] transition hover:bg-[#eff6ff]"
          >
            Open app
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </header>

      <section className="relative isolate flex min-h-[620px] overflow-hidden bg-[#171a1f] pt-16 text-white lg:h-[calc(100vh-32px)] lg:max-h-[760px]">
        <ProductBackdrop />
        <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center px-5 py-14 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-[#93c5fd]">
              Systematic and scoping review screening
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Citebench
            </h1>
            <p className="mt-5 max-w-xl text-xl font-medium leading-8 text-[#d9e4e1] sm:text-2xl">
              Screen evidence with clarity, from first import to final decision.
            </p>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#aabcb6] sm:text-base">
              Citebench gives small review teams one place to clean citation
              records, screen titles and abstracts, resolve disagreements, and
              keep reporting totals connected to the work.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#2563eb] px-5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
              >
                Start a review
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <Link
                href="/app"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Explore the workspace
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#9fb2ac]">
              <span className="flex items-center gap-2">
                <Check aria-hidden="true" className="text-[#60a5fa]" size={14} />
                Two-reviewer decision workflow
              </span>
              <span className="flex items-center gap-2">
                <Check aria-hidden="true" className="text-[#60a5fa]" size={14} />
                CSV import and traceable exports
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-[#dfe5e2] bg-[#f4f6f8]">
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase text-[#1d4ed8]">
              One connected workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              From search results to final decisions.
            </h2>
          </div>
          <div className="mt-10 grid border-y border-[#cfd8d4] lg:grid-cols-3">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.step}
                  className={`py-7 lg:px-7 ${
                    index ? "border-t border-[#cfd8d4] lg:border-l lg:border-t-0" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-md bg-white text-[#2563eb] shadow-sm">
                      <Icon aria-hidden="true" size={19} />
                    </span>
                    <span className="text-xs font-semibold text-[#8b9793]">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-7 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#66736f]">
                    {item.copy}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="scope" className="bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
          <div>
            <p className="text-xs font-semibold uppercase text-[#1d4ed8]">
              V1 product boundary
            </p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold sm:text-4xl">
              Everything needed for title and abstract screening.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[#66736f]">
              Citebench is deliberately scoped for small review teams that need
              a defensible screening process without the weight of institutional
              review software.
            </p>
          </div>
          <div className="border border-[#d8e0dd]">
            {boundaries.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 border-b border-[#e3e9e6] px-5 py-4 text-sm font-medium text-[#34413d] last:border-b-0"
              >
                <span className="grid size-6 place-items-center rounded-md bg-[#ecfdf5] text-[#0f766e]">
                  <Check aria-hidden="true" size={14} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#dfe5e2] bg-[#f7f9f8]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-6 text-xs text-[#72807b] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>Citebench · Evidence screening workspace</span>
          <Link href="/sign-in" className="font-semibold text-[#2563eb]">
            Sign in to Citebench
          </Link>
        </div>
      </footer>
    </main>
  );
}

function ProductBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-16 right-[-260px] hidden w-[900px] opacity-55 lg:block xl:right-[-100px]"
    >
      <div className="absolute inset-y-12 left-0 w-px bg-white/10" />
      <div className="ml-20 mt-16 w-[760px] border border-white/10 bg-[#20242a] shadow-[0_40px_100px_rgba(0,0,0,0.25)]">
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-5">
          <div>
            <p className="text-xs font-semibold text-white">
              Stroke rehabilitation review
            </p>
            <p className="mt-1 text-[10px] text-[#839892]">
              Title and abstract screening
            </p>
          </div>
          <span className="rounded-full bg-[#60a5fa]/15 px-2.5 py-1 text-[10px] font-semibold text-[#60a5fa]">
            Screening
          </span>
        </div>
        <div className="grid grid-cols-4 border-b border-white/10">
          {[
            ["1,284", "Unique records"],
            ["912", "Screened"],
            ["71%", "Complete"],
            ["38", "Needs review"],
          ].map(([value, label]) => (
            <div key={label} className="border-r border-white/10 px-4 py-5 last:border-r-0">
              <p className="text-xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-[10px] text-[#81958f]">{label}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-white">Screening queue</p>
            <p className="text-[10px] text-[#839892]">4 recent records</p>
          </div>
          <div className="border border-white/10">
            {decisions.map(([title, verdict, year]) => (
              <div
                key={title}
                className="grid grid-cols-[1fr_80px_44px] items-center gap-3 border-b border-white/10 px-4 py-3 text-[11px] last:border-b-0"
              >
                <span className="truncate text-[#d4dfdc]">{title}</span>
                <span
                  className={
                    verdict === "Include"
                      ? "text-[#5eead4]"
                      : verdict === "Maybe"
                        ? "text-[#e5bb69]"
                        : "text-[#e4a092]"
                  }
                >
                  {verdict}
                </span>
                <span className="text-[#71857f]">{year}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
