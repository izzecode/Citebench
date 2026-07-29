"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileUp,
  ListChecks,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AppChrome,
  PageEyebrow,
  buttonClass,
  secondaryButtonClass,
} from "@/components/app-chrome";
import { createProject, upsertProject } from "@/lib/citebench";
import { createHostedProject } from "@/lib/supabase/projects";

const inputClass =
  "mt-2 w-full rounded-md border border-[#cbd5d1] bg-white px-3.5 text-sm text-[#1d2926] outline-none transition placeholder:text-[#9aa6a2] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#dbeafe]";

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [researchQuestion, setResearchQuestion] = useState("");
  const [inclusionCriteria, setInclusionCriteria] = useState("");
  const [exclusionCriteria, setExclusionCriteria] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Add a project title to continue.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const input = {
        title,
        researchQuestion,
        inclusionCriteria,
        exclusionCriteria,
      };
      const hostedProject = await createHostedProject(input);
      const project = hostedProject ?? createProject(input);

      if (!hostedProject) {
        upsertProject(project);
      }

      router.push(`/app/projects/${project.id}/import`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The project could not be created.",
      );
      setCreating(false);
    }
  }

  return (
    <AppChrome>
      <Link
        href="/app"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#66736f] hover:text-[#2563eb]"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Projects
      </Link>

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,760px)_300px] xl:items-start">
        <div>
          <PageEyebrow>New review</PageEyebrow>
          <h1 className="mt-2 text-3xl font-semibold text-[#17211f] sm:text-4xl">
            Define the review
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736f]">
            Write the question and eligibility criteria reviewers will use for
            every screening decision.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-7 border border-[#d8e0dd] bg-white shadow-[0_8px_30px_rgba(23,33,31,0.04)]"
          >
            <div className="border-b border-[#e3e9e6] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-md bg-[#eff6ff] text-[#2563eb]">
                  <ListChecks aria-hidden="true" size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#17211f]">
                    Review protocol
                  </h2>
                  <p className="mt-0.5 text-xs text-[#7a8682]">
                    You can refine these details later.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <Field label="Project title" required>
                <input
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setError("");
                  }}
                  placeholder="e.g. Telehealth follow-up after stroke"
                  className={`${inputClass} h-11`}
                  autoFocus
                />
              </Field>

              <Field
                label="Research question"
                hint="A focused question keeps decisions consistent across reviewers."
              >
                <textarea
                  value={researchQuestion}
                  onChange={(event) => setResearchQuestion(event.target.value)}
                  rows={3}
                  placeholder="What is this review trying to answer?"
                  className={`${inputClass} py-3 leading-6`}
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Inclusion criteria">
                  <textarea
                    value={inclusionCriteria}
                    onChange={(event) => setInclusionCriteria(event.target.value)}
                    rows={6}
                    placeholder="Population, intervention, study design, date range..."
                    className={`${inputClass} py-3 leading-6`}
                  />
                </Field>

                <Field label="Exclusion criteria">
                  <textarea
                    value={exclusionCriteria}
                    onChange={(event) => setExclusionCriteria(event.target.value)}
                    rows={6}
                    placeholder="Wrong population, no primary data, irrelevant outcome..."
                    className={`${inputClass} py-3 leading-6`}
                  />
                </Field>
              </div>

              {error ? (
                <p
                  className="border border-[#f0c4b8] bg-[#fff4f0] px-3 py-2.5 text-sm font-medium text-[#9a3f2e]"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#e3e9e6] bg-[#fafcfb] px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
              <Link href="/app" className={secondaryButtonClass}>
                Cancel
              </Link>
              <button type="submit" disabled={creating} className={buttonClass}>
                {creating ? "Creating..." : "Create and import"}
                <ArrowRight aria-hidden="true" size={16} />
              </button>
            </div>
          </form>
        </div>

        <aside className="border-t-2 border-[#2563eb] bg-[#eff6ff] p-5 xl:sticky xl:top-8">
          <p className="text-xs font-semibold uppercase text-[#1d4ed8]">
            Setup path
          </p>
          <ol className="mt-5 space-y-5">
            <SetupStep
              icon={<Check size={15} />}
              title="Define criteria"
              copy="Set the decision rules for this review."
              active
            />
            <SetupStep
              icon={<FileUp size={15} />}
              title="Import citations"
              copy="Upload a CSV and check duplicates."
            />
            <SetupStep
              icon={<Users size={15} />}
              title="Begin screening"
              copy="Review titles and abstracts in a focused queue."
            />
          </ol>
        </aside>
      </div>
    </AppChrome>
  );
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1 text-sm font-semibold text-[#26322f]">
        {label}
        {required ? <span className="text-[#b7503d]">*</span> : null}
      </span>
      {hint ? <span className="mt-1 block text-xs text-[#7a8682]">{hint}</span> : null}
      {children}
    </label>
  );
}

function SetupStep({
  icon,
  title,
  copy,
  active = false,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
  active?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-md ${
          active
            ? "bg-[#2563eb] text-white"
            : "border border-[#b9cbc5] bg-white text-[#70807b]"
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-[#26322f]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#6f7d78]">{copy}</p>
      </div>
    </li>
  );
}
