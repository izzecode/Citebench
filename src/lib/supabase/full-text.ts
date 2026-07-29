import type {
  Citation,
  FinalVerdict,
  Project,
  ReviewerRole,
} from "@/lib/citebench";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getHostedUser,
  loadHostedReviewerDecisions,
  type HostedReviewerDecision,
} from "@/lib/supabase/projects";

const FULL_TEXT_BUCKET = "citebench-full-text";
const MAX_PDF_BYTES = 25 * 1024 * 1024;

export const fullTextExclusionReasons = [
  "Wrong population",
  "Wrong intervention or exposure",
  "Wrong outcome",
  "Wrong study design",
  "Not primary research",
  "Protocol, editorial, or review",
  "Full text unavailable",
  "Duplicate report",
  "Other",
] as const;

export type FullTextVerdict = FinalVerdict;

export type FullTextDocument = {
  id: string;
  citationId: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  signedUrl: string;
};

export type FullTextDecision = {
  citationId: string;
  reviewerId: string;
  reviewerEmail: string;
  reviewerRole: "owner" | "reviewer";
  verdict: FullTextVerdict;
  exclusionReason: string;
  notes: string;
  decidedAt: string;
};

export type FullTextFinalDecision = {
  citationId: string;
  verdict: FullTextVerdict;
  rationale: string;
  decidedAt: string;
};

export type FullTextWorkspace = {
  documents: FullTextDocument[];
  decisions: FullTextDecision[];
  finalDecisions: FullTextFinalDecision[];
  currentReviewerId?: string;
  currentRole: ReviewerRole;
};

export type FullTextStats = {
  eligible: number;
  documents: number;
  notRetrieved: number;
  completed: number;
  included: number;
  excluded: number;
  conflicts: number;
};

type DocumentRow = {
  id: string;
  citation_id: string;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  updated_at: string;
};

type DecisionRow = {
  citation_id: string;
  reviewer_id: string;
  verdict: FullTextVerdict;
  exclusion_reason: string;
  notes: string;
  updated_at: string;
};

type FinalDecisionRow = {
  citation_id: string;
  verdict: FullTextVerdict;
  rationale: string;
  updated_at: string;
};

export async function loadHostedFullTextWorkspace(
  projectId: string,
): Promise<FullTextWorkspace | null> {
  const supabase = getSupabaseBrowserClient();
  const user = await getHostedUser();

  if (!supabase || !user) {
    return null;
  }

  const [
    { data: reviewerData, error: reviewerError },
    { data: citationData, error: citationError },
  ] = await Promise.all([
    supabase
      .from("reviewers")
      .select("id,user_id,email,role")
      .eq("project_id", projectId),
    supabase.from("citations").select("id").eq("project_id", projectId),
  ]);

  if (reviewerError) {
    throw new Error(reviewerError.message);
  }
  if (citationError) {
    throw new Error(citationError.message);
  }

  const reviewers = (reviewerData ?? []) as Array<{
    id: string;
    user_id: string | null;
    email: string;
    role: ReviewerRole;
  }>;
  const citationIds = ((citationData ?? []) as Array<{ id: string }>).map(
    (citation) => citation.id,
  );
  const currentReviewer = reviewers.find(
    (reviewer) => reviewer.user_id === user.id,
  );

  if (!citationIds.length) {
    return {
      documents: [],
      decisions: [],
      finalDecisions: [],
      currentReviewerId: currentReviewer?.id,
      currentRole: currentReviewer?.role ?? "reviewer",
    };
  }

  const [
    { data: documentData, error: documentError },
    { data: decisionData, error: decisionError },
    { data: finalDecisionData, error: finalDecisionError },
  ] = await Promise.all([
    supabase
      .from("full_text_documents")
      .select("id,citation_id,storage_path,file_name,size_bytes,updated_at")
      .in("citation_id", citationIds),
    supabase
      .from("full_text_decisions")
      .select(
        "citation_id,reviewer_id,verdict,exclusion_reason,notes,updated_at",
      )
      .in("citation_id", citationIds),
    supabase
      .from("full_text_final_decisions")
      .select("citation_id,verdict,rationale,updated_at")
      .in("citation_id", citationIds),
  ]);

  if (documentError) {
    throw new Error(documentError.message);
  }
  if (decisionError) {
    throw new Error(decisionError.message);
  }
  if (finalDecisionError) {
    throw new Error(finalDecisionError.message);
  }

  const reviewerById = new Map(
    reviewers
      .filter(
        (reviewer): reviewer is typeof reviewer & {
          role: "owner" | "reviewer";
        } => reviewer.role === "owner" || reviewer.role === "reviewer",
      )
      .map((reviewer) => [reviewer.id, reviewer]),
  );
  const documents = await Promise.all(
    ((documentData ?? []) as DocumentRow[]).map(async (document) => {
      const { data } = await supabase.storage
        .from(FULL_TEXT_BUCKET)
        .createSignedUrl(document.storage_path, 60 * 60);

      return {
        id: document.id,
        citationId: document.citation_id,
        fileName: document.file_name,
        sizeBytes: document.size_bytes,
        uploadedAt: document.updated_at,
        signedUrl: data?.signedUrl ?? "",
      };
    }),
  );

  return {
    documents,
    decisions: ((decisionData ?? []) as DecisionRow[]).flatMap((decision) => {
      const reviewer = reviewerById.get(decision.reviewer_id);
      if (!reviewer) {
        return [];
      }

      return [
        {
          citationId: decision.citation_id,
          reviewerId: decision.reviewer_id,
          reviewerEmail: reviewer.email,
          reviewerRole: reviewer.role,
          verdict: decision.verdict,
          exclusionReason: decision.exclusion_reason,
          notes: decision.notes,
          decidedAt: decision.updated_at,
        },
      ];
    }),
    finalDecisions: ((finalDecisionData ?? []) as FinalDecisionRow[]).map(
      (decision) => ({
        citationId: decision.citation_id,
        verdict: decision.verdict,
        rationale: decision.rationale,
        decidedAt: decision.updated_at,
      }),
    ),
    currentReviewerId: currentReviewer?.id,
    currentRole: currentReviewer?.role ?? "reviewer",
  };
}

export async function uploadFullTextPdf(
  projectId: string,
  citationId: string,
  file: File,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const user = await getHostedUser();

  if (!supabase || !user) {
    throw new Error("Sign in to upload a full-text PDF.");
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Choose a PDF file.");
  }
  if (!file.size || file.size > MAX_PDF_BYTES) {
    throw new Error("PDF files must be smaller than 25 MB.");
  }

  const storagePath = `${projectId}/${citationId}/full-text.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(FULL_TEXT_BUCKET)
    .upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: metadataError } = await supabase
    .from("full_text_documents")
    .upsert(
      {
        citation_id: citationId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: "application/pdf",
        size_bytes: file.size,
        uploaded_by: user.id,
      },
      { onConflict: "citation_id" },
    );

  if (metadataError) {
    throw new Error(metadataError.message);
  }
}

export async function saveFullTextDecision(
  citationId: string,
  reviewerId: string,
  verdict: FullTextVerdict,
  exclusionReason: string,
  notes: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Sign in to save a full-text decision.");
  }
  if (verdict === "exclude" && !exclusionReason.trim()) {
    throw new Error("Choose a full-text exclusion reason.");
  }

  const { error } = await supabase.from("full_text_decisions").upsert(
    {
      citation_id: citationId,
      reviewer_id: reviewerId,
      verdict,
      exclusion_reason: verdict === "exclude" ? exclusionReason.trim() : "",
      notes: notes.trim(),
    },
    { onConflict: "citation_id,reviewer_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveFullTextFinalDecision(
  citationId: string,
  verdict: FullTextVerdict,
  rationale: string,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const user = await getHostedUser();

  if (!supabase || !user) {
    throw new Error("Sign in to resolve full-text decisions.");
  }
  if (!rationale.trim()) {
    throw new Error("Add a short final-decision rationale.");
  }

  const { error } = await supabase.from("full_text_final_decisions").upsert(
    {
      citation_id: citationId,
      verdict,
      rationale: rationale.trim(),
      decided_by: user.id,
    },
    { onConflict: "citation_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getFullTextEligibleCitations(
  project: Project,
): Promise<Citation[]> {
  const citations = project.citations.filter((citation) => !citation.duplicateOf);

  if (project.screeningMode === "solo") {
    return citations.filter((citation) => {
      const finalDecision = project.finalDecisions[citation.id];
      if (finalDecision) {
        return finalDecision.verdict === "include";
      }
      return project.decisions[citation.id]?.verdict === "include";
    });
  }

  const hostedDecisions = (await loadHostedReviewerDecisions(project.id)) ?? [];
  const decisionsByCitation = groupReviewerDecisions(hostedDecisions);

  return citations.filter((citation) => {
    const finalDecision = project.finalDecisions[citation.id];
    if (finalDecision) {
      return finalDecision.verdict === "include";
    }

    const decisions = decisionsByCitation.get(citation.id) ?? [];
    return (
      decisions.length >= 2 &&
      decisions.every((decision) => decision.verdict === "include")
    );
  });
}

export async function buildHostedReviewDatasetCsv(project: Project) {
  const [titleDecisions, workspace] = await Promise.all([
    loadHostedReviewerDecisions(project.id),
    loadHostedFullTextWorkspace(project.id),
  ]);
  const titleByCitation = groupReviewerDecisions(titleDecisions ?? []);
  const fullTextByCitation = groupFullTextDecisions(
    workspace?.decisions ?? [],
  );
  const documentByCitation = new Map(
    workspace?.documents.map((document) => [
      document.citationId,
      document.fileName,
    ]),
  );
  const fullTextFinalByCitation = new Map(
    workspace?.finalDecisions.map((decision) => [
      decision.citationId,
      decision,
    ]),
  );
  const headers = [
    "title",
    "abstract",
    "authors",
    "year",
    "journal",
    "doi",
    "source",
    "duplicate_of",
    "title_abstract_reviewer_decisions",
    "title_abstract_final_verdict",
    "title_abstract_final_rationale",
    "full_text_document",
    "full_text_reviewer_decisions",
    "full_text_final_verdict",
    "full_text_final_rationale",
  ];
  const rows = project.citations.map((citation) => {
    const titleFinal = project.finalDecisions[citation.id];
    const fullTextFinal = fullTextFinalByCitation.get(citation.id);

    return [
      citation.title,
      citation.abstract,
      citation.authors,
      citation.year,
      citation.journal,
      citation.doi,
      citation.source,
      citation.duplicateOf ?? "",
      formatDecisionExport(titleByCitation.get(citation.id) ?? []),
      titleFinal?.verdict ?? "",
      titleFinal?.rationale ?? "",
      documentByCitation.get(citation.id) ?? "",
      formatFullTextDecisionExport(
        fullTextByCitation.get(citation.id) ?? [],
      ),
      fullTextFinal?.verdict ?? "",
      fullTextFinal?.rationale ?? "",
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function calculateFullTextStats(
  project: Project,
  eligible: Citation[],
  workspace: FullTextWorkspace,
): FullTextStats {
  const documentIds = new Set(
    workspace.documents.map((document) => document.citationId),
  );
  const decisionsByCitation = groupFullTextDecisions(workspace.decisions);
  const finalByCitation = new Map(
    workspace.finalDecisions.map((decision) => [
      decision.citationId,
      decision.verdict,
    ]),
  );
  const expectedVotes = project.screeningMode === "solo" ? 1 : 2;
  let completed = 0;
  let included = 0;
  let excluded = 0;
  let conflicts = 0;

  eligible.forEach((citation) => {
    const finalVerdict = finalByCitation.get(citation.id);
    const decisions = decisionsByCitation.get(citation.id) ?? [];

    if (finalVerdict) {
      completed += 1;
      if (finalVerdict === "include") {
        included += 1;
      } else {
        excluded += 1;
      }
      return;
    }

    if (decisions.length < expectedVotes) {
      return;
    }

    const verdicts = new Set(decisions.map((decision) => decision.verdict));
    if (verdicts.size > 1) {
      conflicts += 1;
      return;
    }

    completed += 1;
    if (decisions[0]?.verdict === "include") {
      included += 1;
    } else {
      excluded += 1;
    }
  });

  return {
    eligible: eligible.length,
    documents: eligible.filter((citation) => documentIds.has(citation.id)).length,
    notRetrieved: eligible.filter((citation) => !documentIds.has(citation.id))
      .length,
    completed,
    included,
    excluded,
    conflicts,
  };
}

function formatDecisionExport(decisions: HostedReviewerDecision[]) {
  return decisions
    .map((decision) => {
      const reason = decision.reason ? ` (${decision.reason})` : "";
      return `${decision.reviewerEmail}: ${decision.verdict}${reason}`;
    })
    .join(" | ");
}

function formatFullTextDecisionExport(decisions: FullTextDecision[]) {
  return decisions
    .map((decision) => {
      const reason = decision.exclusionReason
        ? ` (${decision.exclusionReason})`
        : "";
      const notes = decision.notes ? ` [${decision.notes}]` : "";
      return `${decision.reviewerEmail}: ${decision.verdict}${reason}${notes}`;
    })
    .join(" | ");
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function groupReviewerDecisions(decisions: HostedReviewerDecision[]) {
  const grouped = new Map<string, HostedReviewerDecision[]>();

  decisions.forEach((decision) => {
    const current = grouped.get(decision.citationId) ?? [];
    current.push(decision);
    grouped.set(decision.citationId, current);
  });

  return grouped;
}

function groupFullTextDecisions(decisions: FullTextDecision[]) {
  const grouped = new Map<string, FullTextDecision[]>();

  decisions.forEach((decision) => {
    const current = grouped.get(decision.citationId) ?? [];
    current.push(decision);
    grouped.set(decision.citationId, current);
  });

  return grouped;
}
