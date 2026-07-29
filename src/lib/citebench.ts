export type Verdict = "include" | "maybe" | "exclude";
export type FinalVerdict = "include" | "exclude";

export type Citation = {
  id: string;
  title: string;
  abstract: string;
  authors: string;
  year: string;
  journal: string;
  doi: string;
  source: string;
  duplicateOf?: string;
  droppedReason?: string;
};

export type Decision = {
  citationId: string;
  verdict: Verdict;
  reason: string;
  decidedAt: string;
};

export type FinalDecision = {
  citationId: string;
  verdict: FinalVerdict;
  rationale: string;
  decidedAt: string;
};

export type ImportSummary = {
  imported: number;
  duplicates: number;
  dropped: number;
  totalRows: number;
  droppedRows: Array<{ row: number; reason: string }>;
};

export type Project = {
  id: string;
  title: string;
  researchQuestion: string;
  inclusionCriteria: string;
  exclusionCriteria: string;
  createdAt: string;
  updatedAt: string;
  citations: Citation[];
  decisions: Record<string, Decision>;
  finalDecisions: Record<string, FinalDecision>;
  importSummary?: ImportSummary;
};

export type ProjectInput = Pick<
  Project,
  "title" | "researchQuestion" | "inclusionCriteria" | "exclusionCriteria"
>;

export type ProjectStats = {
  totalCitations: number;
  uniqueCitations: number;
  duplicates: number;
  screened: number;
  pending: number;
  maybes: number;
  included: number;
  excluded: number;
  finalIncluded: number;
  progress: number;
};

const STORAGE_KEY = "citebench.projects.v1";

export const sampleCsv = `Title,Abstract,Authors,Year,Journal,DOI,Source
"Telehealth follow-up after stroke","Prospective evaluation of a nurse-led virtual follow-up pathway for adults discharged after stroke.","A Khan; M Lee",2024,"Journal of Stroke Rehabilitation","10.5555/cb.2024.001",PubMed
"Video-based rehabilitation coaching for stroke survivors","Randomized trial of weekly video coaching to support home rehabilitation after stroke.","J Patel; R Smith",2023,"Digital Rehabilitation","10.5555/cb.2023.002",Scopus
"Telephone medication support after ischemic stroke","Telephone follow-up improved medication adherence during the first 90 days after discharge.","L Jones; B Chen",2022,"Stroke Care","10.5555/cb.2022.003",PubMed
"Remote blood pressure monitoring after stroke","Cohort study of connected blood pressure monitoring for secondary stroke prevention.","D Okafor; S Green",2024,"Journal of Vascular Care","10.5555/cb.2024.004",Embase
"Caregiver experiences of virtual post-stroke clinics","Qualitative interviews explored caregiver experiences of virtual follow-up appointments.","R Mensah; T Wilson",2021,"Patient Experience Journal","10.5555/cb.2021.005",Scopus
"Telestroke thrombolysis in rural emergency departments","Evaluation of specialist video consultation during emergency thrombolysis decisions.","P Adams; C Wright",2020,"Emergency Stroke Medicine","10.5555/cb.2020.006",PubMed
"Mobile physiotherapy after knee arthroplasty","Mobile exercise coaching after elective knee replacement surgery.","N Brown; E Davis",2023,"Orthopaedic Digital Health","10.5555/cb.2023.007",Embase
"Protocol for a virtual stroke follow-up trial","Protocol for a future randomized trial of virtual follow-up after stroke discharge.","F Martin; G Clark",2025,"Trials","10.5555/cb.2025.008",Scopus
"Community portal for long-term stroke recovery","","I Ahmed; K Thomas",2022,"Community Neurology","10.5555/cb.2022.009",PubMed
"Virtual follow-up after stroke discharge","Duplicate database record for the nurse-led virtual follow-up pathway.","A Khan; M Lee",2024,"Journal of Stroke Rehabilitation","10.5555/cb.2024.001",Scopus
"Video-based rehabilitation coaching for stroke survivors","Duplicate title exported without a DOI.","J Patel; R Smith",2023,"Digital Rehabilitation","",Generic
,"This malformed row has no title and should be dropped.","Unknown",2021,"Unknown Journal","",Generic`;

const fieldAliases: Record<keyof Omit<Citation, "id" | "duplicateOf" | "droppedReason">, string[]> = {
  title: ["title", "article title", "publication title", "record title"],
  abstract: ["abstract", "summary", "description"],
  authors: ["authors", "author", "creators"],
  year: ["year", "publication year", "pub year", "date", "publication date"],
  journal: ["journal", "source title", "publication", "journal title"],
  doi: ["doi", "digital object identifier"],
  source: ["source", "database", "origin"],
};

export function createProject(input: ProjectInput): Project {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: input.title.trim(),
    researchQuestion: input.researchQuestion.trim(),
    inclusionCriteria: input.inclusionCriteria.trim(),
    exclusionCriteria: input.exclusionCriteria.trim(),
    createdAt: now,
    updatedAt: now,
    citations: [],
    decisions: {},
    finalDecisions: {},
  };
}

export function parseCitationCsv(csv: string): {
  citations: Citation[];
  summary: ImportSummary;
} {
  const rows = parseCsvRows(csv);
  const [headers = [], ...body] = rows;
  const headerMap = createHeaderMap(headers);
  const citations: Citation[] = [];
  const droppedRows: ImportSummary["droppedRows"] = [];
  const seenByDoi = new Map<string, string>();
  const seenByTitle = new Map<string, string>();
  let duplicateCount = 0;

  body.forEach((row, index) => {
    const rowNumber = index + 2;
    const title = readMappedField(row, headerMap, "title");

    if (!title) {
      droppedRows.push({ row: rowNumber, reason: "Missing title" });
      return;
    }

    const citation: Citation = {
      id: createId(),
      title,
      abstract: readMappedField(row, headerMap, "abstract"),
      authors: readMappedField(row, headerMap, "authors"),
      year: readMappedField(row, headerMap, "year").slice(0, 4),
      journal: readMappedField(row, headerMap, "journal"),
      doi: normalizeDoi(readMappedField(row, headerMap, "doi")),
      source: readMappedField(row, headerMap, "source") || "CSV",
    };

    const doiKey = citation.doi ? normalizeDoi(citation.doi) : "";
    const titleKey = normalizeTitle(citation.title);
    const duplicateOf =
      (doiKey && seenByDoi.get(doiKey)) || seenByTitle.get(titleKey);

    if (duplicateOf) {
      citation.duplicateOf = duplicateOf;
      duplicateCount += 1;
    } else {
      if (doiKey) {
        seenByDoi.set(doiKey, citation.id);
      }
      seenByTitle.set(titleKey, citation.id);
    }

    citations.push(citation);
  });

  return {
    citations,
    summary: {
      imported: citations.filter((citation) => !citation.duplicateOf).length,
      duplicates: duplicateCount,
      dropped: droppedRows.length,
      totalRows: body.length,
      droppedRows,
    },
  };
}

export function calculateStats(project: Project): ProjectStats {
  const unique = project.citations.filter((citation) => !citation.duplicateOf);
  const decisions = Object.values(project.decisions);
  const included = decisions.filter((decision) => decision.verdict === "include").length;
  const excluded = decisions.filter((decision) => decision.verdict === "exclude").length;
  const maybes = decisions.filter((decision) => decision.verdict === "maybe").length;
  const finalIncluded = Object.values(project.finalDecisions).filter(
    (decision) => decision.verdict === "include",
  ).length;
  const screened = decisions.length;
  const pending = Math.max(unique.length - screened, 0);

  return {
    totalCitations: project.citations.length,
    uniqueCitations: unique.length,
    duplicates: project.citations.length - unique.length,
    screened,
    pending,
    maybes,
    included,
    excluded,
    finalIncluded,
    progress: unique.length ? Math.round((screened / unique.length) * 100) : 0,
  };
}

export function getScreenableCitations(project: Project): Citation[] {
  return project.citations.filter((citation) => !citation.duplicateOf);
}

export function getNextUnscreenedIndex(project: Project): number {
  const citations = getScreenableCitations(project);
  const index = citations.findIndex((citation) => !project.decisions[citation.id]);

  return index === -1 ? Math.max(citations.length - 1, 0) : index;
}

export function saveDecision(
  project: Project,
  citationId: string,
  verdict: Verdict,
  reason: string,
): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    decisions: {
      ...project.decisions,
      [citationId]: {
        citationId,
        verdict,
        reason,
        decidedAt: new Date().toISOString(),
      },
    },
  };
}

export function saveFinalDecision(
  project: Project,
  citationId: string,
  verdict: FinalVerdict,
  rationale: string,
): Project {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    finalDecisions: {
      ...project.finalDecisions,
      [citationId]: {
        citationId,
        verdict,
        rationale,
        decidedAt: new Date().toISOString(),
      },
    },
  };
}

export function loadProjects(): Project[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function upsertProject(project: Project): Project[] {
  const projects = loadProjects();
  const exists = projects.some((item) => item.id === project.id);
  const next = exists
    ? projects.map((item) => (item.id === project.id ? project : item))
    : [project, ...projects];

  saveProjects(next);
  return next;
}

export function findProject(projectId: string): Project | undefined {
  return loadProjects().find((project) => project.id === projectId);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function buildScreenedDatasetCsv(project: Project) {
  const headers = [
    "title",
    "abstract",
    "authors",
    "year",
    "journal",
    "doi",
    "source",
    "duplicate_of",
    "reviewer_verdict",
    "reviewer_reason",
    "final_verdict",
    "final_rationale",
  ];

  const rows = project.citations.map((citation) => {
    const decision = project.decisions[citation.id];
    const finalDecision = project.finalDecisions[citation.id];

    return [
      citation.title,
      citation.abstract,
      citation.authors,
      citation.year,
      citation.journal,
      citation.doi,
      citation.source,
      citation.duplicateOf ?? "",
      decision?.verdict ?? "",
      decision?.reason ?? "",
      finalDecision?.verdict ?? "",
      finalDecision?.rationale ?? "",
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

function createHeaderMap(headers: string[]) {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const map = new Map<keyof Omit<Citation, "id" | "duplicateOf" | "droppedReason">, number>();

  Object.entries(fieldAliases).forEach(([field, aliases]) => {
    const index = normalizedHeaders.findIndex((header) =>
      aliases.includes(header),
    );

    if (index !== -1) {
      map.set(field as keyof Omit<Citation, "id" | "duplicateOf" | "droppedReason">, index);
    }
  });

  return map;
}

function readMappedField(
  row: string[],
  headerMap: Map<keyof Omit<Citation, "id" | "duplicateOf" | "droppedReason">, number>,
  field: keyof Omit<Citation, "id" | "duplicateOf" | "droppedReason">,
) {
  const index = headerMap.get(field);
  return index === undefined ? "" : cleanCell(row[index] ?? "");
}

function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cleanCell(cell));
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cleanCell(cell));
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cleanCell(cell));
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(value: string) {
  return cleanCell(value).toLowerCase().replaceAll("_", " ");
}

function normalizeTitle(value: string) {
  return cleanCell(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDoi(value: string) {
  return cleanCell(value)
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .trim();
}

function cleanCell(value: string) {
  return value.trim().replace(/^"|"$/g, "").trim();
}

function escapeCsvCell(value: string) {
  const cell = value ?? "";
  if (/[",\n\r]/.test(cell)) {
    return `"${cell.replaceAll("\"", "\"\"")}"`;
  }
  return cell;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
