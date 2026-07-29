import type { User } from "@supabase/supabase-js";
import {
  createProject,
  type Citation,
  type Decision,
  type FinalDecision,
  type Project,
  type ProjectInput,
} from "@/lib/citebench";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ProjectRow = {
  id: string;
  title: string;
  research_question: string;
  inclusion_criteria: string;
  exclusion_criteria: string;
  created_at: string;
  updated_at: string;
};

type CitationRow = {
  id: string;
  title: string;
  abstract: string;
  authors: string;
  publication_year: number | null;
  journal: string;
  doi: string;
  source: string;
  duplicate_of: string | null;
};

type DecisionRow = {
  citation_id: string;
  verdict: Decision["verdict"];
  reason: string;
  updated_at: string;
};

type FinalDecisionRow = {
  citation_id: string;
  verdict: FinalDecision["verdict"];
  rationale: string;
  updated_at: string;
};

export async function getHostedUser(): Promise<User | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function loadHostedProjects(): Promise<Project[] | null> {
  const supabase = getSupabaseBrowserClient();
  const user = await getHostedUser();

  if (!supabase || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,title,research_question,inclusion_criteria,exclusion_criteria,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const projects = await Promise.all(
    ((data ?? []) as ProjectRow[]).map((row) =>
      loadHostedProject(row.id, user, row),
    ),
  );

  return projects.filter((project): project is Project => Boolean(project));
}

export async function loadHostedProject(
  projectId: string,
  knownUser?: User,
  knownProject?: ProjectRow,
): Promise<Project | undefined | null> {
  const supabase = getSupabaseBrowserClient();
  const user = knownUser ?? (await getHostedUser());

  if (!supabase || !user) {
    return null;
  }

  let projectRow = knownProject;

  if (!projectRow) {
    const { data, error } = await supabase
      .from("projects")
      .select(
        "id,title,research_question,inclusion_criteria,exclusion_criteria,created_at,updated_at",
      )
      .eq("id", projectId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    projectRow = data as ProjectRow | null ?? undefined;
  }

  if (!projectRow) {
    return undefined;
  }

  const [
    { data: citationData, error: citationError },
    { data: reviewerData, error: reviewerError },
  ] = await Promise.all([
    supabase
      .from("citations")
      .select(
        "id,title,abstract,authors,publication_year,journal,doi,source,duplicate_of",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("reviewers")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (citationError) {
    throw new Error(citationError.message);
  }
  if (reviewerError) {
    throw new Error(reviewerError.message);
  }

  const citationRows = (citationData ?? []) as CitationRow[];
  const citationIds = citationRows.map((citation) => citation.id);
  const reviewerId = (reviewerData as { id: string } | null)?.id;

  const decisionRequest = reviewerId
    ? supabase
        .from("decisions")
        .select("citation_id,verdict,reason,updated_at")
        .eq("reviewer_id", reviewerId)
    : Promise.resolve({ data: [], error: null });

  const finalDecisionRequest = citationIds.length
    ? supabase
        .from("final_decisions")
        .select("citation_id,verdict,rationale,updated_at")
        .in("citation_id", citationIds)
    : Promise.resolve({ data: [], error: null });

  const [
    { data: decisionData, error: decisionError },
    { data: finalDecisionData, error: finalDecisionError },
  ] = await Promise.all([decisionRequest, finalDecisionRequest]);

  if (decisionError) {
    throw new Error(decisionError.message);
  }
  if (finalDecisionError) {
    throw new Error(finalDecisionError.message);
  }

  const decisions = Object.fromEntries(
    ((decisionData ?? []) as DecisionRow[]).map((row) => [
      row.citation_id,
      {
        citationId: row.citation_id,
        verdict: row.verdict,
        reason: row.reason,
        decidedAt: row.updated_at,
      } satisfies Decision,
    ]),
  );
  const finalDecisions = Object.fromEntries(
    ((finalDecisionData ?? []) as FinalDecisionRow[]).map((row) => [
      row.citation_id,
      {
        citationId: row.citation_id,
        verdict: row.verdict,
        rationale: row.rationale,
        decidedAt: row.updated_at,
      } satisfies FinalDecision,
    ]),
  );

  return {
    id: projectRow.id,
    title: projectRow.title,
    researchQuestion: projectRow.research_question,
    inclusionCriteria: projectRow.inclusion_criteria,
    exclusionCriteria: projectRow.exclusion_criteria,
    createdAt: projectRow.created_at,
    updatedAt: projectRow.updated_at,
    citations: citationRows.map(mapCitation),
    decisions,
    finalDecisions,
  };
}

export async function createHostedProject(
  input: ProjectInput,
): Promise<Project | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }
  if (!session) {
    return null;
  }

  const project = createProject(input);
  const { data, error } = await supabase.rpc("create_project", {
    p_id: project.id,
    p_title: project.title,
    p_research_question: project.researchQuestion,
    p_inclusion_criteria: project.inclusionCriteria,
    p_exclusion_criteria: project.exclusionCriteria,
  });

  if (error) {
    if (error.code === "42501") {
      throw new Error("Your session expired. Sign in again and retry.");
    }
    throw new Error(error.message);
  }

  const row = data as ProjectRow;

  return {
    ...project,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function persistHostedProject(
  project: Project,
  previousProject?: Project,
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const user = await getHostedUser();

  if (!supabase || !user) {
    return false;
  }

  const { error: projectError } = await supabase
    .from("projects")
    .update({
      title: project.title,
      research_question: project.researchQuestion,
      inclusion_criteria: project.inclusionCriteria,
      exclusion_criteria: project.exclusionCriteria,
    })
    .eq("id", project.id);

  if (projectError) {
    throw new Error(projectError.message);
  }

  if (citationSetChanged(project, previousProject)) {
    await replaceHostedCitations(project);
    return true;
  }

  const reviewerId = await getReviewerId(project.id, user.id);
  if (!reviewerId) {
    throw new Error("Your reviewer record could not be found for this project.");
  }

  const changedDecisions = Object.values(project.decisions).filter((decision) => {
    const previous = previousProject?.decisions[decision.citationId];
    return (
      !previous ||
      previous.verdict !== decision.verdict ||
      previous.reason !== decision.reason
    );
  });

  if (changedDecisions.length) {
    const { error } = await supabase.from("decisions").upsert(
      changedDecisions.map((decision) => ({
        citation_id: decision.citationId,
        reviewer_id: reviewerId,
        verdict: decision.verdict,
        reason: decision.reason,
      })),
      { onConflict: "citation_id,reviewer_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  const changedFinalDecisions = Object.values(project.finalDecisions).filter(
    (decision) => {
      const previous = previousProject?.finalDecisions[decision.citationId];
      return (
        !previous ||
        previous.verdict !== decision.verdict ||
        previous.rationale !== decision.rationale
      );
    },
  );

  if (changedFinalDecisions.length) {
    const { error } = await supabase.from("final_decisions").upsert(
      changedFinalDecisions.map((decision) => ({
        citation_id: decision.citationId,
        verdict: decision.verdict,
        rationale: decision.rationale,
        decided_by: user.id,
      })),
      { onConflict: "citation_id" },
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  return true;
}

async function replaceHostedCitations(project: Project) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return;
  }

  const { error: deleteError } = await supabase
    .from("citations")
    .delete()
    .eq("project_id", project.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const retained = project.citations.filter((citation) => !citation.duplicateOf);
  const duplicates = project.citations.filter((citation) => citation.duplicateOf);

  for (const batch of [retained, duplicates]) {
    if (!batch.length) {
      continue;
    }

    const { error } = await supabase
      .from("citations")
      .insert(batch.map((citation) => citationInsert(project.id, citation)));

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function getReviewerId(projectId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("reviewers")
    .select("id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as { id: string } | null)?.id ?? null;
}

function citationSetChanged(project: Project, previousProject?: Project) {
  if (!previousProject) {
    return project.citations.length > 0;
  }

  return (
    project.citations.length !== previousProject.citations.length ||
    project.citations.some(
      (citation, index) =>
        JSON.stringify(citation) !==
        JSON.stringify(previousProject.citations[index]),
    )
  );
}

function citationInsert(projectId: string, citation: Citation) {
  const parsedYear = Number.parseInt(citation.year, 10);

  return {
    id: citation.id,
    project_id: projectId,
    title: citation.title,
    abstract: citation.abstract,
    authors: citation.authors,
    publication_year: Number.isInteger(parsedYear) ? parsedYear : null,
    journal: citation.journal,
    doi: citation.doi,
    source: citation.source,
    duplicate_of: citation.duplicateOf ?? null,
  };
}

function mapCitation(row: CitationRow): Citation {
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    authors: row.authors,
    year: row.publication_year?.toString() ?? "",
    journal: row.journal,
    doi: row.doi,
    source: row.source,
    duplicateOf: row.duplicate_of ?? undefined,
  };
}
